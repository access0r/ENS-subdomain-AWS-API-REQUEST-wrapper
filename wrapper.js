const Web3 = require('web3');
const AWS = require('aws-sdk');
const { Signer } = require('@aws-amplify/core');
const { hexToBase64, base64ToHex } = require('web3-utils');

// Initialize the ENS resolver contract with the current Accessor Token ID
const web3 = new Web3(window.ethereum);
const resolver = new web3.eth.Contract(AccessorTokenResolver.abi, resolverAddress);
const accessorTokenId = await resolver.methods.accessorTokenId().call();

// Define a custom signer that uses the current Accessor Token ID
class EthereumSigner extends Signer {
    async sign(data) {
        const ethereum = window.ethereum;
        if (!ethereum) {
            throw new Error('Ethereum not found');
        }
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        const signature = await ethereum.request({ method: 'eth_sign', params: [address, hexToBase64(data)] });
        return {
            signedData: data,
            signature: base64ToHex(signature),
            address: address,
            publicKey: null,
            alg: 'ES256K',
            encoding: 'hex',
        };
    }
}

// Wrap AWS API requests as a signer with an ENS subdomain
AWS.config.update({
    region: 'us-west-2',
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-west-2:12345678-1234-5678-9012-345678901234',
        RoleArn: 'arn:aws:iam::123456789012:role/MyRole',
        Logins: {
            [`${accessorTokenId}.${profile}.aws.accessor.eth`]: await new EthereumSigner().sign('aws_credentials_request'),
        },
    }),
});

// Use AWS API with the wrapped signer
const s3 = new AWS.S3();
s3.listBuckets(function(err, data) {
    if (err) {
        console.log('Error:', err);
    } else {
        console.log('Bucket List:', data.Buckets);
    }
});
