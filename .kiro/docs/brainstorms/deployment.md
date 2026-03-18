# Deployment Brainstorm — gptenders.novare.digital

## What We're Building
Production deployment: custom domain, basic auth, uptime monitoring. Minimal cost for <5 users.

## Decisions Made
- **Password protection**: CloudFront Function + Basic Auth (🟢 75%) — zero cost, 10-line JS function
- **Monitoring**: Route 53 Health Check + CloudWatch Alarm + SNS email (🟢 80%) — ~$0.75/month
- **SSL**: ACM certificate in us-east-1 (required by CloudFront), DNS-validated via Route 53
- **S3 origin**: Dedicated bucket with OAC in eu-south-2
- **IaC**: CDK Python, two stacks (cert in us-east-1, hosting in eu-south-2) with cross-region references
- **Credentials**: username=green, password=partners
- **Alert email**: abodis@novare.digital

## Estimated Cost
~$1-2/month total (S3 + CloudFront + Route 53 health check)

## Infrastructure
Located in `infra/` directory. Deploy with `./infra/deploy.sh`.
