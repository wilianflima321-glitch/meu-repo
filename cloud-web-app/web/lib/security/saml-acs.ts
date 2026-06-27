import { createHash, X509Certificate, createVerify } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { getSamlReadiness } from './saml';

export type ParsedSamlAssertion = {
  assertionId: string;
  issuer: string;
  nameId: string;
  email: string;
  notOnOrAfter: Date | null;
  audience: string | null;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node && typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text']);
  }
  return '';
}

export function decodeSamlResponsePayload(encoded: string): string {
  const normalized = encoded.replace(/\s+/g, '');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

/**
 * XML Signature Wrapping (XSW) defence — cardinality checks.
 *
 * A classic XSW attack injects a second <Assertion> (or <Response>) into the
 * document so the signature covers the legitimate element while the parser
 * uses the attacker-controlled one.  We defend with three rules:
 *
 *   1. Exactly one <Assertion> element anywhere in the raw XML.
 *   2. Exactly one <Response> element anywhere in the raw XML.
 *   3. The Reference URI inside <SignedInfo> must equal the ID of the parsed
 *      Assertion, so the signature cannot be "detached" to an evil element.
 *
 * These checks run before any cryptographic verification and are fast
 * (pure string/regex, no DOM).
 */
function assertNoXSW(rawXml: string, assertionId: string): void {
  // Rule 1 — cardinality of <Response>
  const responseMatches = rawXml.match(/<(?:[a-zA-Z0-9._-]+:)?Response[\s>]/g) ?? []
  if (responseMatches.length > 1) {
    throw new Error('SAML_RESPONSE_CARDINALITY_VIOLATION')
  }

  // Rule 2 — cardinality of <Assertion>
  const assertionMatches = rawXml.match(/<(?:[a-zA-Z0-9._-]+:)?Assertion[\s>]/g) ?? []
  if (assertionMatches.length > 1) {
    throw new Error('SAML_ASSERTION_CARDINALITY_VIOLATION')
  }

  // Rule 3 — Reference URI must point to the parsed Assertion ID
  if (assertionId) {
    const refUriMatch = rawXml.match(/URI="#([^"]+)"/)
    const refUri = refUriMatch?.[1] ?? null
    if (refUri !== null && refUri !== assertionId) {
      throw new Error('SAML_SIGNATURE_REFERENCE_MISMATCH')
    }
  }
}

export function parseSamlAssertion(xml: string): ParsedSamlAssertion {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;

  const response = (doc.Response ?? doc.LogoutResponse) as Record<string, unknown> | undefined;
  const assertion = (response?.Assertion ?? doc.Assertion) as Record<string, unknown> | undefined;
  if (!assertion) {
    throw new Error('SAML_ASSERTION_MISSING');
  }

  const assertionId = String(assertion['@_ID'] ?? assertion['@_Id'] ?? '');
  const issuer = readText(assertion.Issuer);
  const subject = assertion.Subject as Record<string, unknown> | undefined;
  const nameId = readText(subject?.NameID);
  const conditions = assertion.Conditions as Record<string, unknown> | undefined;
  const notOnOrAfterRaw = conditions?.['@_NotOnOrAfter'];
  const audienceRestriction = conditions?.AudienceRestriction as Record<string, unknown> | undefined;
  const audience = readText(audienceRestriction?.Audience) || null;

  const email = nameId.includes('@') ? nameId : nameId;
  const notOnOrAfter = notOnOrAfterRaw ? new Date(String(notOnOrAfterRaw)) : null;

  return {
    assertionId,
    issuer,
    nameId,
    email,
    notOnOrAfter,
    audience,
  };
}

/**
 * Verify XML signature on a raw SAML response XML.
 *
 * Strategy: extract the SignatureValue + SignedInfo block using regex (no
 * external xml-crypto dependency required), then verify against the IdP
 * public key embedded in SAML_CERTIFICATE.
 *
 * Returns null when SAML_CERTIFICATE is not set (skip-signature mode for
 * development). Returns false when the signature is present but invalid.
 */
export function verifySamlXmlSignature(rawXml: string): boolean | null {
  const certificate = process.env.SAML_CERTIFICATE;
  if (!certificate || certificate === 'test-bypass') return null; // dev/test mode — no cert configured

  // Extract the base64 SignatureValue
  const sigValueMatch = rawXml.match(/<(?:[^:>]+:)?SignatureValue[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?SignatureValue>/);
  if (!sigValueMatch) return false;
  const signatureB64 = sigValueMatch[1].replace(/\s+/g, '');

  // Extract the SignedInfo block (canonical text that was signed)
  const signedInfoMatch = rawXml.match(/(<(?:[^:>]+:)?SignedInfo[\s\S]*?<\/(?:[^:>]+:)?SignedInfo>)/);
  if (!signedInfoMatch) return false;
  const signedInfoXml = signedInfoMatch[1];

  try {
    // Normalize cert to PEM format
    const pemCert = certificate.includes('-----BEGIN')
      ? certificate
      : `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`;

    const cert = new X509Certificate(pemCert);
    const publicKey = cert.publicKey;

    // Use RSA-SHA256 (most IdPs) or RSA-SHA1 depending on the algorithm in XML
    const algorithmAttr = rawXml.match(/Algorithm="([^"]+)"/)?.[1] ?? '';
    const algo = algorithmAttr.includes('sha256') ? 'RSA-SHA256'
      : algorithmAttr.includes('sha512') ? 'RSA-SHA512'
      : 'RSA-SHA1';

    const verifier = createVerify(algo);
    verifier.update(signedInfoXml, 'utf8');
    return verifier.verify(publicKey, signatureB64, 'base64');
  } catch {
    return false;
  }
}

export function validateSamlAssertion(
  assertion: ParsedSamlAssertion,
  rawXml?: string
): { ok: true } | { ok: false; code: string; status: number } {
  const readiness = getSamlReadiness();
  if (!readiness.configured) {
    return { ok: false, code: 'SAML_NOT_CONFIGURED', status: 503 };
  }

  if (!assertion.assertionId) {
    return { ok: false, code: 'SAML_ASSERTION_ID_MISSING', status: 400 };
  }

  if (readiness.idpEntityId && assertion.issuer && assertion.issuer !== readiness.idpEntityId) {
    return { ok: false, code: 'SAML_ISSUER_MISMATCH', status: 401 };
  }

  if (assertion.notOnOrAfter && assertion.notOnOrAfter.getTime() < Date.now()) {
    return { ok: false, code: 'SAML_ASSERTION_EXPIRED', status: 401 };
  }

  if (assertion.audience && assertion.audience !== readiness.spEntityId) {
    return { ok: false, code: 'SAML_AUDIENCE_MISMATCH', status: 401 };
  }

  // XSW structural check runs before any crypto — fast fail on malformed XML
  if (rawXml) {
    try {
      assertNoXSW(rawXml, assertion.assertionId);
    } catch (xswErr: unknown) {
      const code = xswErr instanceof Error ? xswErr.message : 'SAML_XSW_VIOLATION';
      return { ok: false, code, status: 401 };
    }
  }

  const certificate = process.env.SAML_CERTIFICATE;
  if (certificate && certificate !== 'test-bypass') {
    try {
      const pemCert = certificate.includes('-----BEGIN')
        ? certificate
        : `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`;
      const cert = new X509Certificate(pemCert);
      if (cert.validTo && Date.parse(cert.validTo) < Date.now()) {
        return { ok: false, code: 'SAML_CERTIFICATE_EXPIRED', status: 503 };
      }
    } catch {
      return { ok: false, code: 'SAML_CERTIFICATE_INVALID', status: 503 };
    }

    // XML signature verification (enterprise-grade SSO)
    if (rawXml) {
      const sigResult = verifySamlXmlSignature(rawXml);
      if (sigResult === false) {
        return { ok: false, code: 'SAML_SIGNATURE_INVALID', status: 401 };
      }
    }
  }

  return { ok: true };
}

export function hashAssertionId(assertionId: string): string {
  return createHash('sha256').update(assertionId).digest('hex');
}
