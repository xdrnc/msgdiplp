/**
 * DelayControls - Demo controls for artificial delay simulation
 *
 * Provides UI for:
 * - Master enable/disable toggle
 * - Delay duration input (ms)
 * - Phase 1 delay toggle
 * - Phase 2 delay toggle
 * - Refresh button to reload current page
 */

import { useState, useCallback, useEffect } from 'react';
import './DelayControls.css';

/**
 * DelayControls component
 * @param {Object} props
 * @param {Object} props.delayConfig - Current delay configuration
 * @param {boolean} props.delayConfig.enabled - Master toggle
 * @param {number} props.delayConfig.duration - Delay in ms
 * @param {boolean} props.delayConfig.phase1 - Phase 1 delay enabled
 * @param {boolean} props.delayConfig.phase2 - Phase 2 delay enabled
 * @param {Function} props.onDelayConfigChange - Callback when config changes
 * @param {Function} props.onRefresh - Callback to refresh current page
 * @param {boolean} props.isRefreshing - Whether a refresh is in progress (separate from normal loading)
 */
export function DelayControls({
  delayConfig,
  onDelayConfigChange,
  onRefresh,
  isRefreshing
}) {
  // Local state for immediate UI feedback (synced with parent via onChange)
  const [localConfig, setLocalConfig] = useState(delayConfig);
  
  // Sync local state when props change
  useEffect(() => {
    setLocalConfig(delayConfig);
  }, [delayConfig]);
  
  const handleChange = useCallback((key, value) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onDelayConfigChange(newConfig);
  }, [localConfig, onDelayConfigChange]);
  
  const handleDurationChange = useCallback((e) => {
    const value = Math.max(0, parseInt(e.target.value, 10) || 0);
    handleChange('duration', value);
  }, [handleChange]);
  
  const handleRefresh = useCallback(() => {
    if (onRefresh && !isRefreshing) {
      onRefresh();
    }
  }, [onRefresh, isRefreshing]);
  
  return (
    <div className="delay-controls">
      <h3>Demo Controls</h3>
      
      {/* Master Toggle */}
      <div className="delay-control-row">
        <label className="delay-toggle">
          <input
            type="checkbox"
            checked={localConfig.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Enable Artificial Delay</span>
        </label>
      </div>
      
      {/* Duration Input with Counter Buttons */}
      <div className="delay-control-row">
        <label className="delay-input-label">
          Delay Duration (ms):
          <div className="delay-input-wrapper">
            <button
              type="button"
              className="delay-input-btn delay-input-btn--minus"
              onClick={() => handleChange('duration', Math.max(0, localConfig.duration - 500))}
              disabled={!localConfig.enabled || localConfig.duration <= 0}
              aria-label="Decrease delay by 500ms"
            >
              −
            </button>
            <input
              type="number"
              className="delay-input"
              value={localConfig.duration}
              onChange={handleDurationChange}
              min="0"
              max="10000"
              step="500"
              disabled={!localConfig.enabled}
              readOnly
            />
            <button
              type="button"
              className="delay-input-btn delay-input-btn--plus"
              onClick={() => handleChange('duration', Math.min(10000, localConfig.duration + 500))}
              disabled={!localConfig.enabled || localConfig.duration >= 10000}
              aria-label="Increase delay by 500ms"
            >
              +
            </button>
          </div>
        </label>
      </div>
      
      {/* Phase Toggles */}
      <div className="delay-control-row">
        <fieldset className="delay-phase-toggles" disabled={!localConfig.enabled}>
          <legend>Apply Delay To:</legend>
          
          <label className="delay-toggle">
            <input
              type="checkbox"
              checked={localConfig.phase1}
              onChange={(e) => handleChange('phase1', e.target.checked)}
              disabled={!localConfig.enabled}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Phase 1 (Initial Load)</span>
          </label>
          
          <label className="delay-toggle">
            <input
              type="checkbox"
              checked={localConfig.phase2}
              onChange={(e) => handleChange('phase2', e.target.checked)}
              disabled={!localConfig.enabled}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Phase 2 (Enrichment)</span>
          </label>
        </fieldset>
      </div>
      
      {/* Refresh Button */}
      <div className="delay-control-row">
        <button
          className="delay-refresh-btn"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Reload current page with current delay settings"
        >
          {isRefreshing ? (
            <>
              <span className="refresh-spinner"></span>
              Refreshing...
            </>
          ) : (
            'Refresh Page'
          )}
        </button>
      </div>
      
      {/* Status Display */}
      {localConfig.enabled && (
        <div className="delay-status">
          <small>
            Active: {localConfig.duration}ms delay on
            {localConfig.phase1 && localConfig.phase2 ? 'both phases' :
             localConfig.phase1 ? 'Phase 1 only' :
             localConfig.phase2 ? 'Phase 2 only' : 'no phases (check toggles)'}
          </small>
        </div>
      )}
    </div>
  );
}