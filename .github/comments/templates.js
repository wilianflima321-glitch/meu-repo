module.exports = {
  success: (pr) => `Playwright CI completed for PR #${pr}. Artifacts were collected.`,
  failure: (pr, fails) => `Playwright CI found ${fails} failing tests on PR #${pr}. Please check the report.`
};
