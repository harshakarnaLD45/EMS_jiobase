# Supabase Storage Setup Instructions

## Storage Bucket Configuration

Since storage buckets cannot be created via SQL scripts, follow these steps in your new Supabase dashboard:

### 1. Create Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. **Bucket name**: `leave-documents`
4. **Public bucket**: ✅ **CHECKED** - Public access enabled
5. **File size limit**: ✅ **1MB** - Maximum upload size
6. **Allowed MIME types**: 
   - `application/pdf`
   - `image/jpeg`
   - `image/png`
   - `image/gif`
   - `text/plain`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 2. Storage Policies (RLS) - FOR PUBLIC BUCKET

Since you've chosen a **PUBLIC bucket**, files will be accessible via direct URLs. However, you still need these policies for upload/delete operations:

#### Policy 1: Allow Authenticated Uploads
```sql
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'leave-documents');
```

#### Policy 2: Allow Public Reads (Already enabled by public bucket)
```sql
-- This policy is automatically enabled for public buckets
-- Files are accessible at: https://your-project.supabase.co/storage/v1/object/public/leave-documents/filename
```

#### Policy 3: Allow Authenticated Updates
```sql
CREATE POLICY "Allow authenticated updates" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'leave-documents');
```

#### Policy 4: Allow Authenticated Deletes
```sql
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'leave-documents');
```

### 4. Bucket Settings Verification

After creating the bucket, verify these settings in the Storage dashboard:

- ✅ **Bucket name**: `leave-documents`
- ✅ **Public**: ✅ **ENABLED** - Direct URL access available
- ✅ **File size limit**: ✅ **1MB** - Small file uploads only
- ✅ **MIME types**: PDF, Images, Documents allowed

### 5. Test Upload

Test the storage setup by uploading a file through your application or the Supabase dashboard to ensure everything works correctly.

### 6. Environment Variables

Make sure your application has the correct environment variables:

```env
REACT_APP_SUPABASE_URL=your_new_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_new_supabase_anon_key
```

### 7. Storage URL Format - PUBLIC ACCESS

Since you've enabled **PUBLIC bucket**, your uploaded files will be directly accessible at:
```
https://your-project-id.supabase.co/storage/v1/object/public/leave-documents/filename
```

**Example URLs:**
- `https://your-project.supabase.co/storage/v1/object/public/leave-documents/emp123-1698765432.pdf`
- `https://your-project.supabase.co/storage/v1/object/public/leave-documents/emp456-1698765433.jpg`

⚠️ **Security Note**: Since files are publicly accessible, ensure no sensitive information is in filenames.

## Storage Usage in Your Application

The storage is used in your application for:

1. **Leave Request Documents**: When employees submit leave requests with supporting documents
2. **File Types Supported**: PDF, Images (JPG, PNG, GIF), Word documents
3. **File Naming Convention**: `{employee_id}-{timestamp}.{extension}`
4. **Metadata Storage**: File information is stored in `leave_requests` table columns:
   - `has_documentation`
   - `document_url`
   - `document_name`
   - `document_type`
   - `document_size`
   - `uploaded_at`

## Security Notes - PUBLIC BUCKET

- ✅ **File uploads require authentication** - Only logged-in users can upload
- ✅ **Files are associated with specific leave requests** - Tracked in database
- ⚠️ **Files are publicly accessible** - Anyone with the URL can view files
- ✅ **1MB size limit** - Prevents large file abuse
- 🔒 **Recommendations for public bucket**:
  - Don't include sensitive info in filenames
  - Use random/UUID-based filenames (already implemented)
  - Consider file scanning for malware in production
  - Monitor storage usage and file uploads
  - Implement application-level access control for sensitive documents