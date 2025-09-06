import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class FrontendStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;
    public readonly distributionDomainName: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1) S3 バケット（完全非公開）
        this.bucket = new s3.Bucket(this, 'FrontendBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        // 2) OAI を作成（OACは使わない）
        const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');

        // 3) セキュリティヘッダ（最低限のCSP）
        const responseHeaders = new cloudfront.ResponseHeadersPolicy(this, 'ResponseHeaders', {
            securityHeadersBehavior: {
                contentSecurityPolicy: {
                    contentSecurityPolicy: "default-src 'self';",
                    override: true,
                },
                // 必要に応じて他のヘッダも追加OK
            },
        });

        // 4) CloudFront Distribution（S3BucketOrigin + OAI）
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(this.bucket, {
                    originAccessIdentity: oai, // ← OAI を使う
                }),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                responseHeadersPolicy: responseHeaders,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            defaultRootObject: 'index.html',
        });

        // 5) OAC前提のバケットポリシーは不要
        //    （S3BucketOrigin + OAI で、CDK が CanonicalUser への GetObject を自動付与します）

        this.distributionDomainName = this.distribution.distributionDomainName;

        // 出力
        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: this.distributionDomainName,
        });
        new cdk.CfnOutput(this, 'DistributionId', {
            value: this.distribution.distributionId,
        });
        new cdk.CfnOutput(this, 'BucketName', {
            value: this.bucket.bucketName,
        });
    }
}
