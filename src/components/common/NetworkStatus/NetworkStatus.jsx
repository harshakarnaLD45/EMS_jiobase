import React, { useState, useEffect } from 'react';
import { checkSupabaseConnection, connectionStatus } from '../../../utils/supabase';
import './NetworkStatus.css';

/**
 * NetworkStatus Component
 * 
 * Displays connection status and provides feedback for Indian ISP users
 * who may be experiencing DNS blocks on *.supabase.co domains.
 * 
 * Uses JioBase proxy to bypass ISP restrictions.
 */
export function NetworkStatus() {
    const [status, setStatus] = useState({
        checking: true,
        healthy: null,
        latency: null,
        error: null
    });
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        checkConnection();
        
        // Check connection every 30 seconds
        const interval = setInterval(checkConnection, 30000);
        return () => clearInterval(interval);
    }, []);

    async function checkConnection() {
        setStatus(prev => ({ ...prev, checking: true }));
        const result = await checkSupabaseConnection();
        
        setStatus({
            checking: false,
            healthy: result.healthy,
            latency: result.latency,
            error: result.error
        });
    }

    // Don't show anything while initially checking
    if (status.checking && status.healthy === null) {
        return (
            <div className="network-status network-status--checking">
                <div className="network-status__indicator"></div>
                <span className="network-status__text">Checking connection...</span>
            </div>
        );
    }

    // Connection healthy - show minimal indicator
    if (status.healthy) {
        return (
            <div 
                className="network-status network-status--healthy"
                onClick={() => setShowDetails(!showDetails)}
                title="Click for details"
            >
                <div className="network-status__indicator"></div>
                {showDetails && (
                    <span className="network-status__details">
                        Connected via {connectionStatus.isProxy ? 'JioBase proxy' : 'direct'}
                        {status.latency && ` (${status.latency}ms)`}
                    </span>
                )}
            </div>
        );
    }

    // Connection failed - show error with help
    return (
        <div className="network-status network-status--error">
            <div className="network-status__indicator"></div>
            <div className="network-status__content">
                <span className="network-status__text">Connection issue detected</span>
                <button 
                    className="network-status__help-btn"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    {showDetails ? 'Hide' : 'Help'}
                </button>
                
                {showDetails && (
                    <div className="network-status__help">
                        <p>
                            <strong>Unable to connect to the server.</strong>
                        </p>
                        <p>
                            If you're in India using Jio, Airtel, ACT, or BSNL, 
                            this may be due to ISP restrictions.
                        </p>
                        <ul>
                            <li>Try using a VPN</li>
                            <li>Switch to a different network (office WiFi)</li>
                            <li>Contact your administrator</li>
                        </ul>
                        <button 
                            className="network-status__retry-btn"
                            onClick={checkConnection}
                            disabled={status.checking}
                        >
                            {status.checking ? 'Retrying...' : 'Retry Connection'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default NetworkStatus;
