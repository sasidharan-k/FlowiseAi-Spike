# Helpful commands that work: 

## Creating the stack with CloudFormation and the FlowiseCloud image
``` bash
aws cloudformation create-stack --stack-name flowiseEnterprise1 --template-body 'file:///Users/franklin.williams/Developer/Socrata/FlowiseCloud/flowise-cloudformation.yml' --capabilities CAPABILITY_IAM --region us-west-1 --profile personal   --parameters 'ParameterKey=DockerHubSecretArn,ParameterValue=arn:aws:secretsmanager:us-west-1:220391501202:secret:DockerHubSecretArn-ElFlYb'
```
_Note_: The secrets manager points to a secret that I added - username should be `spaceballone` and the password my PAT

### CloudFormation
Cloud formation will need to reference both the image, and the custom creds:

``` yaml
Name: "flowise-service"
    Image: "flowise/flowise_enterprise"
    RepositoryCredentials:
        CredentialsParameter: !Ref DockerHubSecretArn
```

## Building a custom image to deploy
``` bash
docker buildx build --platform linux/amd64 -t 220391501202.dkr.ecr.us-west-1.amazonaws.com/flowise-custom1:latest . 
```

_Note_: Buildx is required so that Docker targets the Fargate platform, and not the Mac OSX


## Authenticating and Pushing
``` bash
aws ecr get-login-password --region us-east-1 --profile personal | docker login --username AWS --password-stdin 220391501202.dkr.ecr.us-west-1.amazonaws.com
docker tag flowise-custom1:latest 220391501202.dkr.ecr.us-west-1.amazonaws.com/flowise-custom1:latest
docker push 220391501202.dkr.ecr.us-west-1.amazonaws.com/flowise-custom1:latest
```

# Things I set up manually:
* Added /ping as the health check to the Target Groups in the CLoud FOrmation template
* Registered a new domain name
* Pointed the hosted zone at the domain that CloudFormation created
* Add listener on 443 to the LB
* Added the SSL certificate to the LB
* Create our own custom repository 