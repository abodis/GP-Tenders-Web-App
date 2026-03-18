#!/usr/bin/env python3
"""CDK app for GPTenders web hosting infrastructure.

Two stacks:
  1. CertStack (us-east-1) — ACM certificate (CloudFront requires certs in us-east-1)
  2. HostingStack (eu-south-2) — S3 bucket, CloudFront, Route 53, basic auth, monitoring
"""
import aws_cdk as cdk

from cert_stack import CertStack
from hosting_stack import HostingStack

ACCOUNT = "390503782314"
DOMAIN_NAME = "gptenders.novare.digital"
HOSTED_ZONE_ID = "Z00156341TQZA2HB6Z4D0"
HOSTED_ZONE_NAME = "novare.digital"
ALERT_EMAIL = "abodis@novare.digital"

app = cdk.App()

cert_stack = CertStack(
    app,
    "GptendersCertStack",
    domain_name=DOMAIN_NAME,
    hosted_zone_id=HOSTED_ZONE_ID,
    hosted_zone_name=HOSTED_ZONE_NAME,
    alert_email=ALERT_EMAIL,
    env=cdk.Environment(account=ACCOUNT, region="us-east-1"),
    cross_region_references=True,
)

HostingStack(
    app,
    "GptendersHostingStack",
    domain_name=DOMAIN_NAME,
    hosted_zone_id=HOSTED_ZONE_ID,
    hosted_zone_name=HOSTED_ZONE_NAME,
    certificate=cert_stack.certificate,
    env=cdk.Environment(account=ACCOUNT, region="eu-south-2"),
    cross_region_references=True,
)

app.synth()
