#!/usr/bin/env bash
set -euo pipefail

# Deploy GPTenders infrastructure and app
# Usage: ./infra/deploy.sh [--infra-only | --app-only]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
AWS_PROFILE="${AWS_PROFILE:-mcp}"

deploy_infra() {
    echo "==> Deploying CDK infrastructure..."
    cd "$SCRIPT_DIR"

    cdk deploy --all \
        --profile "$AWS_PROFILE" \
        --require-approval never \
        --outputs-file cdk-outputs.json

    echo "==> Infrastructure deployed."
}

deploy_app() {
    echo "==> Building app..."
    cd "$PROJECT_DIR"
    npm run build

    # Read bucket name and distribution ID from CDK outputs
    OUTPUTS_FILE="$SCRIPT_DIR/cdk-outputs.json"
    if [ ! -f "$OUTPUTS_FILE" ]; then
        echo "ERROR: cdk-outputs.json not found. Run with --infra-only first."
        exit 1
    fi

    BUCKET_NAME=$(python3 -c "import json; d=json.load(open('$OUTPUTS_FILE')); print(d['GptendersHostingStack']['BucketName'])")
    DIST_ID=$(python3 -c "import json; d=json.load(open('$OUTPUTS_FILE')); print(d['GptendersHostingStack']['DistributionId'])")

    echo "==> Uploading to S3 bucket: $BUCKET_NAME"
    aws s3 sync dist/ "s3://$BUCKET_NAME" --delete --profile "$AWS_PROFILE"

    echo "==> Invalidating CloudFront cache: $DIST_ID"
    aws cloudfront create-invalidation \
        --distribution-id "$DIST_ID" \
        --paths "/*" \
        --profile "$AWS_PROFILE" \
        --no-cli-pager

    echo "==> App deployed to https://gptenders.novare.digital"
}

case "${1:-all}" in
    --infra-only) deploy_infra ;;
    --app-only)   deploy_app ;;
    all)          deploy_infra && deploy_app ;;
    *)            echo "Usage: $0 [--infra-only | --app-only]"; exit 1 ;;
esac
