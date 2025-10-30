import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import '../../pages/employeeManagement/EmployeeManagement.css';


const Notification = ({ 
    notification, 
    onClose,
    autoClose = true,
    autoCloseDelay = 30000
}) => {
    React.useEffect(() => {
        if (notification && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [notification, autoClose, autoCloseDelay, onClose]);

    if (!notification) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle size={20} />;
            case 'error':
                return <AlertCircle size={20} />;
            case 'warning':
                return <AlertTriangle size={20} />;
            case 'info':
            default:
                return <Info size={20} />;
        }
    };

    const getNotificationClass = (type) => {
        const baseClass = 'notification';
        switch (type) {
            case 'success':
                return `${baseClass} success`;
            case 'error':
                return `${baseClass} error`;
            case 'warning':
                return `${baseClass} warning`;
            case 'info':
            default:
                return `${baseClass} info`;
        }
    };

    return (
        <div className={getNotificationClass(notification.type)}>
            <div className="notification-content">
                <div className="notification-icon">
                    {getIcon(notification.type)}
                </div>
                <span className="notification-message">
                    {notification.message}
                </span>
            </div>
            <button
                onClick={onClose}
                className="notification-close"
                title="Close notification"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Notification;