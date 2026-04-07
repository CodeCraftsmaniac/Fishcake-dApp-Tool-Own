# Fishcake VM Created By Copilot

## VM created in this session

- Name: fishcake-second-bot
- State: RUNNING
- Region: us-ashburn-1
- Availability Domain: fXwc:US-ASHBURN-AD-3
- Shape: VM.Standard.E2.1.Micro
- OCPU: 1
- Memory: 1 GB
- Instance OCID: ocid1.instance.oc1.iad.anuwcljtqntgwbycozwjmfnui7ivfsjpvvxmpyqnrgvk66vp33oonojk5pca
- Public IP: 129.213.138.245
- Private IP: 10.0.1.8
- Subnet OCID: ocid1.subnet.oc1.iad.aaaaaaaawsu6peeaps4angkgkilwvnrztoprvqn5amshzrzqwp5tsnxty4na
- Image OCID: ocid1.image.oc1.iad.aaaaaaaarmbfidgrunjyh24wfxpwqk3l7vpzqhcuniu4cz2n7g3cn6aeqjcq
- Boot volume size: 50 GB
- Boot volume performance: 10 VPUs/GB

## How to access fishcake-second-bot

Use the same SSH private key pair already used for fcc-trade-bot (the public key is attached to this VM metadata).

### Windows PowerShell SSH command

ssh -i "C:\path\to\your\private_key" ubuntu@129.213.138.245

### If Ubuntu username fails

Try these usernames in order:

1. ubuntu
2. opc

## Quick connectivity checks

1. Make sure port 22 is open in your subnet security rules/NSG.
2. Confirm your public IP is allowed if your SSH rule is restricted.
3. Test TCP 22 from your machine:

Test-NetConnection 129.213.138.245 -Port 22

## OCI API key files currently present on this machine

- C:\Users\rhran\.oci\config
- C:\Users\rhran\.oci\oci_api_key.pem

Keep these files private.
