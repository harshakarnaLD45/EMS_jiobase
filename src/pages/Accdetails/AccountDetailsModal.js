import React, { useState, useEffect } from 'react';
import { X, User, Building2, CreditCard, Loader2 } from 'lucide-react';
import { accountDetailsApi } from '../../utils/supabase';
import './accountdetails.css';

const AccountDetailsModal = ({ employeeId, employeeName, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ account: {}, employee: {} });

    useEffect(() => {
        loadAccountDetails();
    }, [employeeId]);

    const loadAccountDetails = async () => {
        try {
            setLoading(true);
            const result = await accountDetailsApi.getAccountDetailsByEmployeeId(employeeId);
            setData(result);
        } catch (error) {
            console.error('Error loading account details:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatValue = (value) => {
        if (!value || value === '') {
            return <span className="account-detail-value not-provided">Not provided</span>;
        }
        return <span className="account-detail-value">{value}</span>;
    };

    const formatAccountNumber = (value) => {
        if (!value) return <span className="account-detail-value not-provided">Not provided</span>;
        return <span className="account-detail-value">{value}</span>;
    };

    const formatAadhaar = (value) => {
        if (!value) return <span className="account-detail-value not-provided">Not provided</span>;
        
        const formatted = value.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
        return <span className="account-detail-value">{formatted}</span>;
    };

    // Split name into first and last
    const nameParts = (data.employee?.name || employeeName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return (
        <div className="account-modal-overlay" onClick={onClose}>
            <div className="account-modal" onClick={e => e.stopPropagation()} style={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                overflow: 'hidden'
            }}>
                <div className="account-modal-header" style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: 'white'
                }}>
                    <h2 className="bodyMediumText2">Account Details</h2>
                    <button className="account-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="account-modal-body" style={{
                    overflowY: 'auto',
                    flex: 1,
                    scrollbarWidth: 'none', /* Firefox */
                    msOverflowStyle: 'none'  /* IE and Edge */
                }}>
                    <style>{`
                        .account-modal-body::-webkit-scrollbar {
                            display: none; /* Chrome, Safari, Opera */
                        }
                    `}</style>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6' }} />
                        </div>
                    ) : (
                        <>
                            {/* Personal Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 className="bodyMediumText3" style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    marginBottom: '0.75rem',
                                    color: '#374151'
                                }}>
                                    <User size={16} style={{ color: '#3b82f6' }} />
                                    Personal Information
                                </h3>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">First Name</span>
                                    {formatValue(firstName)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Last Name</span>
                                    {formatValue(lastName)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Phone Number</span>
                                    {formatValue(data.employee?.phone)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Email</span>
                                    {formatValue(data.employee?.email)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Department</span>
                                    {formatValue(data.employee?.department)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Position</span>
                                    {formatValue(data.employee?.position)}
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 className="bodyMediumText3" style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    marginBottom: '0.75rem',
                                    color: '#374151'
                                }}>
                                    <Building2 size={16} style={{ color: '#3b82f6' }} />
                                    Bank Details
                                </h3>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Bank Name</span>
                                    {formatValue(data.account?.bank_name)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Account Number</span>
                                    {formatAccountNumber(data.account?.bank_account_number)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">IFSC Code</span>
                                    {formatValue(data.account?.ifsc_code)}
                                </div>
                            </div>

                            {/* Identity Details */}
                            <div>
                                <h3 className="bodyMediumText3" style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    marginBottom: '0.75rem',
                                    color: '#374151'
                                }}>
                                    <CreditCard size={16} style={{ color: '#3b82f6' }} />
                                    Identity Details
                                </h3>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">Aadhaar Number</span>
                                    {formatAadhaar(data.account?.aadhaar_number)}
                                </div>
                                <div className="account-detail-row">
                                    <span className="account-detail-label">PAN Number</span>
                                    {formatValue(data.account?.pan_number)}
                                </div>
                                <div className="account-detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span className="account-detail-label" style={{ marginBottom: '0.25rem' }}>Aadhaar Address</span>
                                    {data.account?.aadhaar_address ? (
                                        <span className="account-detail-value" style={{ textAlign: 'left' }}>
                                            {data.account.aadhaar_address}
                                        </span>
                                    ) : (
                                        <span className="account-detail-value not-provided">Not provided</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountDetailsModal;
