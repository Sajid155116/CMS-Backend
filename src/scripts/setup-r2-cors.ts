import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

// Load environment variables
config();

async function setupR2Cors() {
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });

  const bucketName = process.env.R2_BUCKET_NAME || '';

  console.log(`Setting up CORS for bucket: ${bucketName}`);
  console.log(`Endpoint: ${process.env.R2_ENDPOINT}`);

  const corsConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: [
          'http://localhost:3000',
          'http://localhost:4000',
          'https://cms-frontend-tau-khaki.vercel.app',
          'https://cms-backend-production-c843.up.railway.app'
        ],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag', 'Content-Length', 'x-amz-request-id'],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  try {
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    });

    await s3Client.send(command);
    
    console.log('\n✅ CORS configured successfully!');
    console.log('\nCORS Rules Applied:');
    console.log(JSON.stringify(corsConfiguration, null, 2));
    console.log('\n✅ You can now upload files directly to R2 from the frontend!');
  } catch (error) {
    console.error('\n❌ Failed to configure CORS:');
    console.error(error);
    console.error('\nPlease check:');
    console.error('1. Your R2 credentials are correct in .env file');
    console.error('2. The credentials have permission to modify bucket CORS settings');
    console.error('3. The bucket name is correct');
    process.exit(1);
  }
}

setupR2Cors();
