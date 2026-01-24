# Cloudflare R2 CORS Configuration

To enable direct file uploads from the browser to R2, you need to configure CORS on your R2 bucket.

## Steps to Configure CORS

### 1. Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Your Bucket** (`cms-app-bucket-prod`)
3. Click on **Settings**
4. Scroll to **CORS Policy**
5. Add the following CORS configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 2. Using Wrangler CLI (Alternative)

If you prefer using the command line:

```bash
# Install Wrangler if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a CORS configuration file
cat > cors-config.json << EOF
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Apply CORS configuration to your bucket
wrangler r2 bucket cors set cms-app-bucket-prod --cors-config cors-config.json
```

### 3. Using S3 API (Alternative)

You can also use the AWS SDK to configure CORS:

```javascript
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ['http://localhost:3000', 'https://your-production-domain.com'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length'],
      MaxAgeSeconds: 3600,
    },
  ],
};

const command = new PutBucketCorsCommand({
  Bucket: 'cms-app-bucket-prod',
  CORSConfiguration: corsConfiguration,
});

await s3Client.send(command);
console.log('CORS configured successfully');
```

## Important Notes

1. **AllowedOrigins**: Update with your actual frontend domains. For production, remove `http://localhost:3000` and add your production URL.

2. **Security**: Using `"AllowedHeaders": ["*"]` is convenient for development but consider being more specific in production:
   ```json
   "AllowedHeaders": [
     "Content-Type",
     "Content-Length",
     "Content-MD5",
     "x-amz-*"
   ]
   ```

3. **MaxAgeSeconds**: This determines how long browsers cache the CORS preflight response (1 hour = 3600 seconds).

4. **Testing**: After configuring CORS, test the upload flow:
   - Open browser DevTools → Network tab
   - Upload a file
   - You should see:
     - OPTIONS request (CORS preflight) → 200 OK
     - PUT request (actual upload) → 200 OK
   - If you see CORS errors, double-check the configuration

## Verification

To verify CORS is configured correctly:

```bash
# Test CORS with curl
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  https://cms-app-bucket-prod.c80a5fab697831c20c92f31cb14987a8.r2.cloudflarestorage.com/test-file.txt
```

Look for these headers in the response:
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Methods: GET, PUT, POST, DELETE, HEAD`
- `Access-Control-Allow-Headers: *`

## Troubleshooting

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Verify CORS configuration is applied to the bucket
- Check that your frontend origin matches exactly (including protocol and port)
- Wait a few minutes for CORS changes to propagate

### Error: "CORS policy: Response to preflight request doesn't pass"
- Ensure `AllowedMethods` includes `PUT` (required for file uploads)
- Check that `AllowedHeaders` includes all headers your app sends

### Error: "NetworkError when attempting to fetch resource"
- Verify R2 endpoint URL is correct
- Check that the bucket is publicly accessible or presigned URLs are valid
- Ensure credentials have permission to generate presigned URLs
