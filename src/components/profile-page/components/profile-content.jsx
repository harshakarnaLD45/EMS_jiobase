import React, { useState, useEffect } from "react";
import { Shield, Key, Lock, Save, X, Building2 } from "lucide-react";

import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { Badge } from "../../ui/badge";
import ChangePasswordModal from "./ChangePasswordModal";
import AccountDetailsModal from "./AccountDetailsModal";

// Reusable styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px'
  },
  saveIcon: {
    height: '16px',
    width: '16px',
    marginRight: '4px'
  },
  errorMessage: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '14px',
    borderRadius: '6px'
  },
  successMessage: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    fontSize: '14px',
    borderRadius: '6px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '24px'
  },
  fieldContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  labelWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  lockIcon: {
    height: '12px',
    width: '12px',
    color: '#6b7280'
  },
  lockIconLarge: {
    height: '16px',
    width: '16px',
    color: '#6b7280'
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    cursor: 'not-allowed'
  },
  disabledInputCapitalize: {
    backgroundColor: '#f9fafb',
    cursor: 'not-allowed',
    textTransform: 'capitalize'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    height: '40px',
    padding: '0 12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  securityRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  securityInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  securityLabel: {
    fontSize: '16px'
  },
  securityDescription: {
    color: '#6b7280',
    fontSize: '14px'
  },
  keyIcon: {
    marginRight: '8px',
    height: '16px',
    width: '16px'
  }
};

// Badge styles based on status
const getStatusBadgeStyle = (status) => {
  if (status === 'active') {
    return { backgroundColor: '#dcfce7', color: '#15803d' };
  } else if (status === 'on_leave') {
    return { backgroundColor: '#fef9c3', color: '#a16207' };
  }
  return { backgroundColor: '#f3f4f6', color: '#374151' };
};

export default function ProfileContent({ 
  profile, 
  isEditing, 
  saving, 
  onUpdateProfile, 
  onCancelEdit 
}) {
  // Local form state for editing
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAccountDetailsModal, setShowAccountDetailsModal] = useState(false);

  // Initialize form data when profile loads or editing starts
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || profile.name?.split(' ')[0] || '',
        last_name: profile.last_name || profile.name?.split(' ').slice(1).join(' ') || '',
        email: profile.email || '',
        phone: profile.phone || ''
      });
    }
  }, [profile, isEditing]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Handle save
  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    
    const result = await onUpdateProfile(formData);
    
    if (result?.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(result?.error || 'Failed to save profile');
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div style={styles.container}>
      {/* Personal Information - EDITABLE */}
      <Card>
        <CardHeader>
          <div style={styles.headerRow}>
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                {isEditing 
                  ? 'Update your personal details below. Fields marked with a lock cannot be changed.' 
                  : 'Your personal details and contact information.'}
              </CardDescription>
            </div>
            {isEditing && (
              <div style={styles.buttonGroup}>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save style={styles.saveIcon} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
          {saveError && (
            <div style={styles.errorMessage}>
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div style={styles.successMessage}>
              Profile updated successfully!
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div style={styles.formGrid}>
            {/* First Name - EDITABLE */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="first_name">First Name</Label>
              <Input 
                id="first_name" 
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={!isEditing}
                style={!isEditing ? styles.disabledInput : {}}
              />
            </div>

            {/* Last Name - EDITABLE */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="last_name">Last Name</Label>
              <Input 
                id="last_name" 
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={!isEditing}
                style={!isEditing ? styles.disabledInput : {}}
              />
            </div>

            {/* Email - LOCKED */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="email" style={styles.labelWithIcon}>
                Email
                <Lock style={styles.lockIcon} />
              </Label>
              <Input 
                id="email" 
                name="email"
                type="email"
                value={formData.email}
                disabled
                style={styles.disabledInput}
              />
            </div>

            {/* Phone - EDITABLE */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder={isEditing ? 'Enter phone number' : 'Not provided'}
                style={!isEditing ? styles.disabledInput : {}}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information - READ ONLY */}
      <Card>
        <CardHeader>
          <div style={styles.titleRow}>
            <CardTitle>Company Information</CardTitle>
            <Lock style={styles.lockIconLarge} />
          </div>
          <CardDescription>
            Company details are managed by your administrator and cannot be modified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={styles.formGrid}>
            {/* Employee ID - LOCKED */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="employee_id" style={styles.labelWithIcon}>
                Employee ID
                <Lock style={styles.lockIcon} />
              </Label>
              <Input 
                id="employee_id" 
                value={profile?.employee_id || 'N/A'}
                disabled
                style={styles.disabledInput}
              />
            </div>

            {/* Department - LOCKED */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="department" style={styles.labelWithIcon}>
                Department
                <Lock style={styles.lockIcon} />
              </Label>
              <Input 
                id="department" 
                value={profile?.department || 'N/A'}
                disabled
                style={styles.disabledInput}
              />
            </div>

            {/* Position - LOCKED */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="position" style={styles.labelWithIcon}>
                Position / Job Title
                <Lock style={styles.lockIcon} />
              </Label>
              <Input 
                id="position" 
                value={profile?.position || 'N/A'}
                disabled
                style={styles.disabledInput}
              />
            </div>

            {/* Role - LOCKED */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="role" style={styles.labelWithIcon}>
                Role
                <Lock style={styles.lockIcon} />
              </Label>
              <Input 
                id="role" 
                value={profile?.role || 'Employee'}
                disabled
                style={styles.disabledInputCapitalize}
              />
            </div>

            {/* Join Date - LOCKED */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="join_date" style={styles.labelWithIcon}>
                Join Date
                <Lock style={styles.lockIcon} />
              </Label>
              <Input 
                id="join_date" 
                value={formatDate(profile?.join_date)}
                disabled
                style={styles.disabledInput}
              />
            </div>

            {/* Status - LOCKED */}
            <div style={styles.fieldContainer}>
              <Label htmlFor="status" style={styles.labelWithIcon}>
                Employment Status
                <Lock style={styles.lockIcon} />
              </Label>
              <div style={styles.statusContainer}>
                <Badge 
                  variant="secondary"
                  style={getStatusBadgeStyle(profile?.status)}
                >
                  {profile?.status?.replace('_', ' ') || 'Active'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Bank & Identity Details - EMPLOYEE ONLY */}
            {profile?.role !== 'admin' && (
              <>
                <div style={styles.securityRow}>
                  <div style={styles.securityInfo}>
                    <Label style={styles.securityLabel}>Bank & Identity Details</Label>
                    <p style={styles.securityDescription}>
                      Manage your bank account and identity information
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowAccountDetailsModal(true)}>
                    <Building2 style={styles.keyIcon} />
                    Manage Details
                  </Button>
                </div>
                
                <Separator />
              </>
            )}
            
            {/* Change Password */}
            <div style={styles.securityRow}>
              <div style={styles.securityInfo}>
                <Label style={styles.securityLabel}>Password</Label>
                <p style={styles.securityDescription}>
                  Change your account password
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                <Key style={styles.keyIcon} />
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Modal */}
      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        user={profile}
      />

      {/* Account Details Modal */}
      <AccountDetailsModal 
        isOpen={showAccountDetailsModal}
        onClose={() => setShowAccountDetailsModal(false)}
        user={profile}
      />
    </div>
  );
}
