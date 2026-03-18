"""Global stack (us-east-1) — ACM certificate + monitoring.

Both must be in us-east-1:
  - ACM certs for CloudFront
  - Route 53 health check metrics + CloudWatch alarms
"""
import aws_cdk as cdk
import aws_cdk.aws_certificatemanager as acm
import aws_cdk.aws_cloudwatch as cloudwatch
import aws_cdk.aws_cloudwatch_actions as cw_actions
import aws_cdk.aws_route53 as route53
import aws_cdk.aws_sns as sns
import aws_cdk.aws_sns_subscriptions as subs
from constructs import Construct


class CertStack(cdk.Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        domain_name: str,
        hosted_zone_id: str,
        hosted_zone_name: str,
        alert_email: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            "HostedZone",
            hosted_zone_id=hosted_zone_id,
            zone_name=hosted_zone_name,
        )

        self.certificate = acm.Certificate(
            self,
            "Resource",
            domain_name=domain_name,
            validation=acm.CertificateValidation.from_dns(hosted_zone),
        )

        # --- Monitoring (must be in us-east-1 for Route 53 health check metrics) ---
        alert_topic = sns.Topic(self, "AlertTopic", display_name="GPTenders Alerts")
        alert_topic.add_subscription(subs.EmailSubscription(alert_email))

        health_check = route53.CfnHealthCheck(
            self,
            "HealthCheck",
            health_check_config=route53.CfnHealthCheck.HealthCheckConfigProperty(
                type="HTTPS",
                fully_qualified_domain_name=domain_name,
                port=443,
                resource_path="/",
                request_interval=30,
                failure_threshold=3,
            ),
        )

        health_metric = cloudwatch.Metric(
            metric_name="HealthCheckStatus",
            namespace="AWS/Route53",
            dimensions_map={"HealthCheckId": health_check.attr_health_check_id},
            period=cdk.Duration.minutes(1),
            statistic="Minimum",
        )

        alarm = cloudwatch.Alarm(
            self,
            "DowntimeAlarm",
            metric=health_metric,
            threshold=1,
            comparison_operator=cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            evaluation_periods=2,
            alarm_description=f"{domain_name} is down",
            treat_missing_data=cloudwatch.TreatMissingData.BREACHING,
        )
        alarm.add_alarm_action(cw_actions.SnsAction(alert_topic))
        alarm.add_ok_action(cw_actions.SnsAction(alert_topic))
