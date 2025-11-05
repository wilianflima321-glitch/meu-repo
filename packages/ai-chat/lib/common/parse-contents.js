"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseContents = parseContents;
exports.findFirstMatch = findFirstMatch;
const response_content_matcher_1 = require("./response-content-matcher");
function parseContents(text, request, contentMatchers = [response_content_matcher_1.CodeContentMatcher], defaultContentFactory = response_content_matcher_1.MarkdownContentFactory) {
    const result = [];
    let currentIndex = 0;
    while (currentIndex < text.length) {
        const remainingText = text.substring(currentIndex);
        const match = findFirstMatch(contentMatchers, remainingText);
        if (!match) {
            // Add the remaining text as default content
            if (remainingText.length > 0) {
                result.push(defaultContentFactory(remainingText, request));
            }
            break;
        }
        // We have a match
        // 1. Add preceding text as default content
        if (match.index > 0) {
            const precedingContent = remainingText.substring(0, match.index);
            if (precedingContent.trim().length > 0) {
                result.push(defaultContentFactory(precedingContent, request));
            }
        }
        // 2. Add the matched content object
        if (match.isComplete) {
            // Complete match, use regular content factory
            result.push(match.matcher.contentFactory(match.content, request));
        }
        else if (match.matcher.incompleteContentFactory) {
            // Incomplete match with an incomplete content factory available
            result.push(match.matcher.incompleteContentFactory(match.content, request));
        }
        else {
            // Incomplete match but no incomplete content factory available, use default
            result.push(defaultContentFactory(match.content, request));
        }
        // Update currentIndex to the end of the end of the match
        // And continue with the search after the end of the match
        currentIndex += match.index + match.content.length;
    }
    return result;
}
function findFirstMatch(contentMatchers, text) {
    let firstMatch;
    let firstIncompleteMatch;
    for (const matcher of contentMatchers) {
        const startMatch = matcher.start.exec(text);
        if (!startMatch) {
            // No start match found, try next matcher.
            continue;
        }
        const endOfStartMatch = startMatch.index + startMatch[0].length;
        if (endOfStartMatch >= text.length) {
            // There is no text after the start match.
            // This is an incomplete match if the matcher has an incompleteContentFactory
            if (matcher.incompleteContentFactory) {
                const incompleteMatch = {
                    matcher,
                    index: startMatch.index,
                    content: text.substring(startMatch.index),
                    isComplete: false
                };
                if (!firstIncompleteMatch || incompleteMatch.index < firstIncompleteMatch.index) {
                    firstIncompleteMatch = incompleteMatch;
                }
            }
            continue;
        }
        const remainingTextAfterStartMatch = text.substring(endOfStartMatch);
        const endMatch = matcher.end.exec(remainingTextAfterStartMatch);
        if (!endMatch) {
            // No end match found, this is an incomplete match
            if (matcher.incompleteContentFactory) {
                const incompleteMatch = {
                    matcher,
                    index: startMatch.index,
                    content: text.substring(startMatch.index),
                    isComplete: false
                };
                if (!firstIncompleteMatch || incompleteMatch.index < firstIncompleteMatch.index) {
                    firstIncompleteMatch = incompleteMatch;
                }
            }
            continue;
        }
        // Found start and end match.
        // Record the full match, if it is the earliest found so far.
        const index = startMatch.index;
        const contentEnd = index + startMatch[0].length + endMatch.index + endMatch[0].length;
        const content = text.substring(index, contentEnd);
        const completeMatch = { matcher, index, content, isComplete: true };
        if (!firstMatch || index < firstMatch.index) {
            firstMatch = completeMatch;
        }
    }
    // If we found a complete match, return it
    if (firstMatch) {
        return firstMatch;
    }
    // Otherwise, return the first incomplete match if one exists
    return firstIncompleteMatch;
}
//# sourceMappingURL=parse-contents.js.map