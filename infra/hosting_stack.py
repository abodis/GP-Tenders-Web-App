"""Hosting stack — S3, CloudFront, Route 53, basic auth."""
import aws_cdk as cdk
import aws_cdk.aws_certificatemanager as acm
import aws_cdk.aws_cloudfront as cloudfront
import aws_cdk.aws_cloudfront_origins as origins
import aws_cdk.aws_route53 as route53
import aws_cdk.aws_route53_targets as targets
import aws_cdk.aws_s3 as s3
from constructs import Construct

# Basic auth credentials — CloudFront Function uses base64 of "green:partners"
# echo -n "green:partners" | base64 = Z3JlZW46cGFydG5lcnM=
BASIC_AUTH_CREDENTIALS = "Z3JlZW46cGFydG5lcnM="

BASIC_AUTH_FUNCTION_CODE = f"""\
function handler(event) {{
  var request = event.request;
  var headers = request.headers;
  var expected = "Basic {BASIC_AUTH_CREDENTIALS}";

  if (
    typeof headers.authorization === "undefined" ||
    headers.authorization.value !== expected
  ) {{
    return {{
      statusCode: 401,
      statusDescription: "Unauthorized",
      headers: {{
        "www-authenticate": {{ value: "Basic realm=\\"GPTenders\\"" }},
      }},
    }};
  }}

  return request;
}}
"""


class HostingStack(cdk.Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        domain_name: str,
        hosted_zone_id: str,
        hosted_zone_name: str,
        certificate: acm.ICertificate,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- S3 bucket (private, OAC access only) ---
        bucket = s3.Bucket(
            self,
            "WebBucket",
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )

        # --- CloudFront Function for basic auth ---
        auth_function = cloudfront.Function(
            self,
            "BasicAuthFunction",
            code=cloudfront.FunctionCode.from_inline(BASIC_AUTH_FUNCTION_CODE),
            runtime=cloudfront.FunctionRuntime.JS_2_0,
            comment="Basic auth for GPTenders",
        )

        # --- CloudFront distribution ---
        distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                function_associations=[
                    cloudfront.FunctionAssociation(
                        function=auth_function,
                        event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                    )
                ],
            ),
            domain_names=[domain_name],
            certificate=certificate,
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_page_path="/index.html",
                    response_http_status=200,
                    ttl=cdk.Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_page_path="/index.html",
                    response_http_status=200,
                    ttl=cdk.Duration.seconds(0),
                ),
            ],
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        )

        # --- Route 53 alias record ---
        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            "HostedZone",
            hosted_zone_id=hosted_zone_id,
            zone_name=hosted_zone_name,
        )

        route53.ARecord(
            self,
            "AliasRecord",
            zone=hosted_zone,
            record_name=domain_name,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
        )

        route53.AaaaRecord(
            self,
            "AliasRecordIPv6",
            zone=hosted_zone,
            record_name=domain_name,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
        )

        # --- Outputs ---
        cdk.CfnOutput(self, "BucketName", value=bucket.bucket_name)
        cdk.CfnOutput(self, "DistributionId", value=distribution.distribution_id)
        cdk.CfnOutput(self, "DistributionDomain", value=distribution.distribution_domain_name)
        cdk.CfnOutput(self, "SiteUrl", value=f"https://{domain_name}")
