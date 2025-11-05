"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeCard = void 0;
const core_1 = require("@theia/core");
const React = require("@theia/core/shared/react");
const getTextFromResponse = (response) => {
    // Handle monitored stream response
    if ('parts' in response) {
        let result = '';
        for (const chunk of response.parts) {
            if ('content' in chunk && chunk.content) {
                result += chunk.content;
            }
        }
        return result;
    }
    // Handle text response
    if ('text' in response) {
        return response.text;
    }
    // Handle parsed response
    if ('content' in response) {
        return response.content;
    }
    return JSON.stringify(response);
};
const renderTextWithNewlines = (text) => text.split(/\\n|\n/).map((line, i) => (React.createElement(React.Fragment, { key: i },
    i > 0 && React.createElement("br", null),
    line)));
const formatJson = (data) => {
    try {
        return JSON.stringify(data, undefined, 2);
    }
    catch (error) {
        console.error('Error formatting JSON:', error);
        return 'Error formatting data';
    }
};
const formatTimestamp = (timestamp) => timestamp ? new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
}) : 'N/A';
const ExchangeCard = ({ exchange, selectedAgentId, compactView = true, renderNewlines = false }) => {
    const earliestTimestamp = exchange.requests.reduce((earliest, req) => {
        const timestamp = req.metadata.timestamp || 0;
        return timestamp && (!earliest || timestamp < earliest) ? timestamp : earliest;
    }, 0);
    return (React.createElement("div", { className: "theia-card exchange-card", role: "article", "aria-label": `Exchange ${exchange.id}` },
        React.createElement("div", { className: 'theia-card-meta' },
            React.createElement("span", { className: 'theia-card-request-id' },
                core_1.nls.localize('theia/ai/history/exchange-card/exchangeId', 'ID'),
                ": ",
                exchange.id),
            exchange.metadata.agent && (React.createElement("span", { className: 'theia-card-agent-id' },
                core_1.nls.localize('theia/ai/history/exchange-card/agentId', 'Agent'),
                ": ",
                exchange.metadata.agent))),
        React.createElement("div", { className: 'theia-card-content' },
            React.createElement("div", { className: 'requests-container' }, exchange.requests.map((request, index) => (React.createElement(RequestCard, { key: request.id, request: request, index: index, totalRequests: exchange.requests.length, selectedAgentId: selectedAgentId, compactView: compactView, renderNewlines: renderNewlines }))))),
        React.createElement("div", { className: 'theia-card-meta' }, earliestTimestamp > 0 && (React.createElement("span", { className: 'theia-card-timestamp' },
            core_1.nls.localize('theia/ai/history/exchange-card/timestamp', 'Started'),
            ": ",
            formatTimestamp(earliestTimestamp))))));
};
exports.ExchangeCard = ExchangeCard;
const RequestCard = ({ request, index, totalRequests, selectedAgentId, compactView = true, renderNewlines = false }) => {
    const isFromDifferentAgent = selectedAgentId &&
        request.metadata.agent &&
        request.metadata.agent !== selectedAgentId;
    const isStreamResponse = 'parts' in request.response;
    const getRequestContent = () => {
        if (compactView) {
            const content = formatJson(request.request.messages);
            return (React.createElement("div", { className: "compact-response" },
                React.createElement("pre", { className: `formatted-json ${renderNewlines ? 'render-newlines' : ''}` }, renderNewlines ? renderTextWithNewlines(content) : content)));
        }
        else {
            const content = formatJson(request.request);
            return (React.createElement("pre", { className: `formatted-json ${renderNewlines ? 'render-newlines' : ''}` }, renderNewlines ? renderTextWithNewlines(content) : content));
        }
    };
    const getResponseContent = () => {
        if (compactView) {
            const content = getTextFromResponse(request.response);
            return (React.createElement("div", { className: "compact-response" },
                React.createElement("pre", { className: `formatted-json ${renderNewlines ? 'render-newlines' : ''}` }, renderNewlines ? renderTextWithNewlines(content) : content)));
        }
        else if (isStreamResponse) {
            const streamResponse = request.response;
            return streamResponse.parts.map((part, i) => (React.createElement("div", { key: `part-${i}`, className: "stream-part" },
                React.createElement("pre", { className: `formatted-json ${renderNewlines ? 'render-newlines' : ''}` }, renderNewlines ? renderTextWithNewlines(JSON.stringify(part, undefined, 2)) : JSON.stringify(part, undefined, 2)))));
        }
        else {
            const content = formatJson(request.response);
            return (React.createElement("pre", { className: `formatted-json ${renderNewlines ? 'render-newlines' : ''}` }, renderNewlines ? renderTextWithNewlines(content) : content));
        }
    };
    return (React.createElement("div", { className: `request-card ${isFromDifferentAgent ? 'different-agent-opacity' : ''}` },
        React.createElement("div", { className: 'request-header' },
            totalRequests > 1 && (React.createElement("h3", null,
                core_1.nls.localize('theia/ai/history/request-card/title', 'Request'),
                " ",
                index + 1)),
            React.createElement("div", { className: 'request-info' },
                React.createElement("span", { className: 'request-id' },
                    "ID: ",
                    request.id),
                request.metadata.agent && (React.createElement("span", { className: `request-agent ${isFromDifferentAgent ? 'different-agent-name' : ''}` },
                    core_1.nls.localize('theia/ai/history/request-card/agent', 'Agent'),
                    ": ",
                    request.metadata.agent)),
                React.createElement("span", { className: 'request-model' },
                    core_1.nls.localize('theia/ai/history/request-card/model', 'Model'),
                    ": ",
                    request.languageModel))),
        React.createElement("div", { className: 'request-content-container' },
            React.createElement("details", null,
                React.createElement("summary", null, core_1.nls.localize('theia/ai/history/request-card/request', 'Request')),
                React.createElement("div", { className: 'request-content' }, getRequestContent())),
            React.createElement("details", null,
                React.createElement("summary", null, core_1.nls.localize('theia/ai/history/request-card/response', 'Response')),
                React.createElement("div", { className: 'response-content' }, getResponseContent()))),
        React.createElement("div", { className: 'request-meta' }, request.metadata.timestamp && (React.createElement("span", { className: 'request-timestamp' },
            core_1.nls.localize('theia/ai/history/request-card/timestamp', 'Timestamp'),
            ": ",
            formatTimestamp(request.metadata.timestamp))))));
};
//# sourceMappingURL=ai-history-exchange-card.js.map