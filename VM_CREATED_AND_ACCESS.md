# Fishcake VM Created By Copilot

## VMs in this tenancy

### neil-blumenthal (CURRENT - Backend Deployment)
- Name: neil-blumenthal
- State: RUNNING
- Region: us-ashburn-1
- Availability Domain: fXwc:US-ASHBURN-AD-3
- Shape: VM.Standard.E2.1.Micro
- OCPU: 1
- Memory: 1 GB
- Instance OCID: ocid1.instance.oc1.iad.anuwcljtqntgwbycg44yyvzd7qikrnljlpc6doq7ujcabhwqlqy63kjet74a
- Public IP: 129.80.144.145
- Private IP: 10.0.1.114
- Subnet OCID: ocid1.subnet.oc1.iad.aaaaaaaawsu6peeaps4angkgkilwvnrztoprvqn5amshzrzqwp5tsnxty4na
- Image OCID: ocid1.image.oc1.iad.aaaaaaaarmbfidgrunjyh24wfxpwqk3l7vpzqhcuniu4cz2n7g3cn6aeqjcq
- Boot volume size: 50 GB
- Created: 2026-04-23

### fcc-trade-bot (Existing)
- Name: fcc-trade-bot
- State: RUNNING
- Region: us-ashburn-1
- Public IP: 193.122.236.162

### fishcake-second-bot (DELETED)
- Was at IP 129.213.138.245 - no longer exists


ocid1.tenancy.oc1..aaaaaaaa66bsc3ztzcpw4q5uoltpibjtszdwtcre5kfha5y4vm537ix2aaaa

ocid1.user.oc1..aaaaaaaabd25alnsuepoa6f35rsvv32pgz65e5vbyikk2fdyzorxor4xrmdq

event@fishcake.io-2026-04-03T06_28_56.247Z file

2c:5d:57:81:a9:26:fd:37:d8:76:8e:db:ab:ac:63:ce

[DEFAULT]
user=ocid1.user.oc1..aaaaaaaabd25alnsuepoa6f35rsvv32pgz65e5vbyikk2fdyzorxor4xrmdq
fingerprint=2c:5d:57:81:a9:26:fd:37:d8:76:8e:db:ab:ac:63:ce
tenancy=ocid1.tenancy.oc1..aaaaaaaa66bsc3ztzcpw4q5uoltpibjtszdwtcre5kfha5y4vm537ix2aaaa
region=us-ashburn-1
key_file=<path to your private keyfile> # TODO

## How to access neil-blumenthal

Use the same SSH private key pair already used for fcc-trade-bot (the public key is attached to this VM metadata).

### Windows PowerShell SSH command

ssh -i "C:\path\to\your\private_key" ubuntu@129.80.144.145

### If Ubuntu username fails

Try these usernames in order:

1. ubuntu
2. opc

## Quick connectivity checks

1. Make sure port 22 is open in your subnet security rules/NSG.
2. Confirm your public IP is allowed if your SSH rule is restricted.
3. Test TCP 22 from your machine:

Test-NetConnection 129.80.144.145 -Port 22

## OCI API key files currently present on this machine

- C:\Users\rhran\.oci\config
- C:\Users\rhran\.oci\oci_api_key.pem

Keep these files private.
