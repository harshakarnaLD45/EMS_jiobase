import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Camera, Calendar, Mail, MapPin, Building2, Briefcase } from "lucide-react";

export default function ProfileHeader({ profile, isEditing, onEditToggle }) {
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format join date
  const formatJoinDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url} alt={profile?.name || 'Profile'} />
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                {getInitials(profile?.name)}
              </AvatarFallback>
            </Avatar>
            {/* {isEditing && (
              <Button
                size="icon"
                variant="outline"
                className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full">
                <Camera className="h-4 w-4" />
              </Button>
            )} */}
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{profile?.name || 'Employee'}</h1>
              <Badge 
                variant="secondary" 
                className={`w-fit ${
                  profile?.status === 'active' 
                    ? 'border-green-200 bg-green-50 text-green-700' 
                    : profile?.status === 'on_leave'
                    ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                {profile?.status || 'Active'}
              </Badge>
            </div>
            
            <p className="text-muted-foreground font-medium">
              {profile?.position || 'Employee'}
            </p>
            
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              {profile?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="size-4" />
                  {profile.email}
                </div>
              )}
              {profile?.department && (
                <div className="flex items-center gap-1">
                  <Building2 className="size-4" />
                  {profile.department}
                </div>
              )}
              {/* {profile?.join_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="size-4" />
                  Joined {formatJoinDate(profile.join_date)}
                </div>
              )} */}
            </div>
          </div>

          {/* Edit Button */}
          <Button 
            variant={isEditing ? "outline" : "default"}
            onClick={onEditToggle}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
