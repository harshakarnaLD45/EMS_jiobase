import React, { useState, useEffect } from "react";
import { Building2, CreditCard, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { accountDetailsApi } from "../../../utils/supabase";

export default function AccountDetailsModal({ isOpen, onClose, user }) {
  const [formData, setFormData] = useState({
    bank_name: '',
    bank_account_number: '',
    ifsc_code: '',
    aadhaar_number: '',
    aadhaar_address: '',
    pan_number: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load account details when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadAccountDetails();
    }
  }, [isOpen, user]);

  const loadAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const employeeId = user?.employee_id || user?.id;
      const details = await accountDetailsApi.getAccountDetails(employeeId);
      
      if (details) {
        setFormData({
          bank_name: details.bank_name || '',
          bank_account_number: details.bank_account_number || '',
          ifsc_code: details.ifsc_code || '',
          aadhaar_number: details.aadhaar_number || '',
          aadhaar_address: details.aadhaar_address || '',
          pan_number: details.pan_number || ''
        });
      }
    } catch (err) {
      console.error('Error loading account details:', err);
      setError('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Apply formatting based on field
    if (name === 'aadhaar_number') {
      formattedValue = value.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'pan_number') {
      formattedValue = value.toUpperCase().slice(0, 10);
    } else if (name === 'ifsc_code') {
      formattedValue = value.toUpperCase().slice(0, 11);
    } else if (name === 'bank_account_number') {
      formattedValue = value.replace(/\D/g, '');
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    setError(null);
    setSuccess(false);
  };

  const validateForm = () => {
    // Validate Aadhaar (12 digits)
    if (formData.aadhaar_number && formData.aadhaar_number.length !== 12) {
      setError('Aadhaar number must be exactly 12 digits');
      return false;
    }
    
    // Validate PAN (10 characters, format: ABCDE1234F)
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
      setError('Invalid PAN format. It should be like ABCDE1234F');
      return false;
    }
    
    // Validate IFSC (11 characters, format: ABCD0123456)
    if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code)) {
      setError('Invalid IFSC format. It should be like ABCD0123456');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      const employeeId = user?.employee_id || user?.id;
      await accountDetailsApi.saveAccountDetails(employeeId, formData);
      
      setSuccess(true);
      
      // Close modal after 2 seconds on success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to save account details');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <Card style={{
        position: 'relative',
        zIndex: 50,
        width: '100%',
        maxWidth: '42rem',
        margin: '0 1rem',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <CardHeader style={{ paddingBottom: '1rem', flexShrink: 0, backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 style={{ height: '1.25rem', width: '1.25rem', color: '#2563eb' }} />
              <CardTitle>Account Details</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              style={{ height: '2rem', width: '2rem' }}
            >
              <X style={{ height: '1rem', width: '1rem' }} />
            </Button>
          </div>
          <CardDescription>
            Manage your bank and identity information for payroll processing.
          </CardDescription>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1 pt-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
              <Loader2 style={{ height: '2rem', width: '2rem', color: '#3b82f6', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#6b7280' }}>Loading account details...</p>
            </div>
          ) : 
          success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', textAlign: 'center' }}>
              <CheckCircle style={{ height: '3rem', width: '3rem', color: '#22c55e', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#15803d' }}>Details Saved!</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Your account details have been updated successfully.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#dc2626', fontSize: '0.875rem' }}>
                  <AlertCircle style={{ height: '1rem', width: '1rem', flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Bank Details Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb'}}>
                  <Building2 style={{ height: '1rem', width: '1rem', color: '#2563eb' }} />
                  <h3 style={{ fontWeight: 600, color: '#111827' }}>Bank Details</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Label htmlFor="bank_name">
                      Bank Name <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <Input
                      id="bank_name"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      placeholder="Enter bank name"
                      disabled={saving}
                      required
                      style={{ outline: 'none', border: '1px solid #e5e7eb' , boxShadow: 'none' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Label htmlFor="bank_account_number">
                      Account Number <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <Input
                      id="bank_account_number"
                      name="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={handleChange}
                      placeholder="Enter account number"
                      disabled={saving}
                      required
                      style={{ outline: 'none', border: '1px solid #e5e7eb' , boxShadow: 'none' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Label htmlFor="ifsc_code">
                      IFSC Code <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <Input
                      id="ifsc_code"
                      name="ifsc_code"
                      value={formData.ifsc_code}
                      onChange={handleChange}
                      placeholder="e.g., SBIN0001234"
                      maxLength={11}
                      disabled={saving}
                      required
                      style={{ outline: 'none', border: '1px solid #e5e7eb' , boxShadow: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Identity Details Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <CreditCard style={{ height: '1rem', width: '1rem', color: '#2563eb' }} />
                  <h3 style={{ fontWeight: 600, color: '#111827' }}>Identity Details</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Label htmlFor="aadhaar_number">
                      Aadhaar Number <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <Input
                      id="aadhaar_number"
                      name="aadhaar_number"
                      value={formData.aadhaar_number}
                      onChange={handleChange}
                      placeholder="12-digit Aadhaar number"
                      maxLength={12}
                      disabled={saving}
                      required
                      style={{ outline: 'none', boxShadow: 'none', border: '1px solid #e5e7eb'  }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Label htmlFor="pan_number">
                      PAN Number <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <Input
                      id="pan_number"
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleChange}
                      placeholder="e.g., ABCDE1234F"
                      maxLength={10}
                      disabled={saving}
                      required
                      style={{ outline: 'none', boxShadow: 'none', border: '1px solid #e5e7eb' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                    <Label htmlFor="aadhaar_address">
                      Aadhaar Address <span style={{ color: '#ef4444' }}>*</span>
                    </Label>
                    <textarea
                      id="aadhaar_address"
                      name="aadhaar_address"
                      value={formData.aadhaar_address}
                      onChange={handleChange}
                      placeholder="Enter address as per Aadhaar"
                      disabled={saving}
                      required
                      style={{ width: '100%', minHeight: '80px', padding: '0.5rem 0.75rem', fontSize: '0.875rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', outline: 'none', resize: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving ? (
                    <>
                      <Loader2 style={{ height: '1rem', width: '1rem', marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                      Saving...
                    </>
                  ) : (
                    'Save Details'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
