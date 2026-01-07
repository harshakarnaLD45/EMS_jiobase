import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { employeeApi } from "../../utils/supabase";
import ProfileHeader from "./components/profile-header";
import ProfileContent from "./components/profile-content";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch employee profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.employee_id && !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const employeeId = user.employee_id || user.id;
        const data = await employeeApi.getEmployeeProfile(employeeId);
        setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err.message);
        // Fallback to user data from auth context
        setProfile({
          id: user.id,
          employee_id: user.employee_id,
          name: user.name,
          first_name: user.name?.split(' ')[0] || '',
          last_name: user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: user.phone || '',
          department: user.department || '',
          position: user.position || '',
          role: user.role || 'employee',
          status: 'active',
          join_date: null
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Handle profile update
  const handleUpdateProfile = async (updates) => {
    if (!profile?.employee_id) return;

    try {
      setSaving(true);
      const updatedProfile = await employeeApi.updateEmployeeProfile(
        profile.employee_id,
        updates
      );
      setProfile(updatedProfile);
      setIsEditing(false);
      return { success: true };
    } catch (err) {
      console.error("Error updating profile:", err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 ">
      <ProfileHeader 
        profile={profile}
        isEditing={isEditing}
        onEditToggle={() => setIsEditing(!isEditing)}
      />
      <ProfileContent 
        profile={profile}
        isEditing={isEditing}
        saving={saving}
        onUpdateProfile={handleUpdateProfile}
        onCancelEdit={() => setIsEditing(false)}
      />
    </div>
  );
}
