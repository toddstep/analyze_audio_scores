# analyze_audio_scores

## Analyze classifier scores that were precomputed using [Kinesis Video Streams - Audio Consumer](https://github.com/toddstep/amazon-kinesis-video-streams-audio-consumer).

## Deployment:
* Install Docker:
    * On Amazon Linux 2023, follow [Creating a container image for use on Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html#create-container-image-prerequisites).
    * On Ubuntu, follow [Installing Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
* Follow the [AWS SAM prerequisites](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/prerequisites.html).
* Install [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
* Set up a domain and hosted zone in [Route 53](https://us-east-1.console.aws.amazon.com/route53/v2/home) for the demo website. Enter this domain for the requested `CloudFrontAlias` when deploying below.
* Create a certificate in [AWS Certificate Manager(ACM)](https://us-east-1.console.aws.amazon.com/acm/home) for the domain. Enter the certificate's arn for the requested `AliasCertificate` when deploying below.
* Build stack and deploy (see Steps 2 and 3 of [Tutorial: Deploying a Hello World application](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-getting-started-hello-world.html)):
    * Answer `y` when asked:
      ```FlaskFunction Function Url has no authentication. Is this okay? ```
```
sam build -u
sam deploy --guided
```
* Use the `ChartFrontUrl` displayed during the deployment to update the domain's hosted zone in Route 53. See [Routing traffic to an Amazon CloudFront distribution by using your domain name](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html).

## Usage:
* Enter your domain name in the browser.
* Select the start and stop times for the analysis window.
* Click on Submit to request the graphs for the most likely birds.
    * If a Throughput error is returned, either select a shorter window or wait a few minutes before resubmitting the request.
