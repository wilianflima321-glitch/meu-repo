'use client';

import { useState } from 'react';
import { ConsentRequest, ConsentResponse } from '@/lib/consent/consent-manager';

interface ConsentDialogProps {
  request: ConsentRequest;
  chargeId: string;
  onApprove: (chargeId: string) => Promise<void>;
  onReject: (chargeId: string) => Promise<void>;
  onClose: () => void;
}

export default function ConsentDialog({
  request,
  chargeId,
  onApprove,
  onReject,
  onClose
}: ConsentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(chargeId);
      onClose();
    } catch (error) {
      console.error('Failed to approve consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(chargeId);
      onClose();
    } catch (error) {
      console.error('Failed to reject consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getRiskColor = () => {
    switch (request.risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getRiskIcon = () => {
    switch (request.risk) {
      case 'low': return 'OK';
      case 'medium': return 'WARN';
      case 'high': return 'HIGH';
      case 'critical': return 'CRIT';
      default: return 'INFO';
    }
  };

  const formatTime = () => {
    const { estimated, unit } = request.time;
    return `${estimated} ${unit}`;
  };

  const formatCost = () => {
    if (request.cost.monetary) {
      return `${request.cost.currency || 'USD'} $${request.cost.monetary.toFixed(2)}`;
    }
    if (request.cost.credits) {
      return `${request.cost.credits} credits`;
    }
    return 'Free';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Consent Required
              </h2>
              <p className="text-slate-300">{request.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Operation */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">
              Operation
            </h3>
            <p className="text-white font-mono">{request.operation}</p>
          </div>

          {/* Risk Assessment */}
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Risk Level */}
              <div>
                <div className="text-sm text-slate-400 mb-1">Risk Level</div>
                <div className={`text-lg font-semibold ${getRiskColor()} flex items-center gap-2`}>
                  <span>{getRiskIcon()}</span>
                  <span className="capitalize">{request.risk}</span>
                </div>
              </div>

              {/* Estimated Time */}
              <div>
                <div className="text-sm text-slate-400 mb-1">Estimated Time</div>
                <div className="text-lg font-semibold text-white">
                  {formatTime()}
                </div>
              </div>

              {/* Cost */}
              <div>
                <div className="text-sm text-slate-400 mb-1">Cost</div>
                <div className="text-lg font-semibold text-white">
                  {formatCost()}
                </div>
              </div>
            </div>
          </div>

          {/* Resources */}
          {Object.keys(request.resources).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">
                Resources Required
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {request.resources.network && (
                  <div className="flex items-center gap-2 p-3 bg-slate-900 rounded">
                    <span className="text-xs font-semibold text-slate-400 w-10 text-center">NET</span>
                    <div>
                      <div className="text-white font-medium">Network Access</div>
                      <div className="text-xs text-slate-400">Internet connection required</div>
                    </div>
                  </div>
                )}
                {request.resources.disk && (
                  <div className="flex items-center gap-2 p-3 bg-slate-900 rounded">
                    <span className="text-xs font-semibold text-slate-400 w-10 text-center">DISK</span>
                    <div>
                      <div className="text-white font-medium">Disk Space</div>
                      <div className="text-xs text-slate-400">{request.resources.disk} MB</div>
                    </div>
                  </div>
                )}
                {request.resources.cpu && (
                  <div className="flex items-center gap-2 p-3 bg-slate-900 rounded">
                    <span className="text-xs font-semibold text-slate-400 w-10 text-center">CPU</span>
                    <div>
                      <div className="text-white font-medium">CPU Usage</div>
                      <div className="text-xs text-slate-400">Processing power required</div>
                    </div>
                  </div>
                )}
                {request.resources.memory && (
                  <div className="flex items-center gap-2 p-3 bg-slate-900 rounded">
                    <span className="text-xs font-semibold text-slate-400 w-10 text-center">RAM</span>
                    <div>
                      <div className="text-white font-medium">Memory</div>
                      <div className="text-xs text-slate-400">{request.resources.memory} MB</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          {request.details && request.details.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">
                Details
              </h3>
              <ul className="space-y-2">
                {request.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-300">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternatives */}
          {request.alternatives && request.alternatives.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">
                Alternatives
              </h3>
              <ul className="space-y-2">
                {request.alternatives.map((alt, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-300">
                    <span className="text-blue-400 mt-1">→</span>
                    <span>{alt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Charge ID */}
          <div className="bg-slate-900 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">Charge ID</div>
            <div className="text-sm text-slate-300 font-mono">{chargeId}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors font-medium"
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors font-medium"
          >
            {isProcessing ? 'Processing...' : 'Approve & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
