import pathlib,json,os,subprocess,hashlib,sys,zipfile
root=pathlib.Path(__file__).resolve().parent.parent
source=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'outputs/android-build'
credentials=json.loads((root/'.android-signing/credentials.json').read_text())
env=os.environ.copy();env['BOLSO_SIGNING_PASSWORD']=credentials['password']
output=root/'outputs/bolso-1.0.0.apk'
subprocess.run(['java','-jar',str(source/'apksigner.jar'),'sign','--ks',str(root/'.android-signing/bolso-release.p12'),'--ks-key-alias',credentials['alias'],'--ks-pass','env:BOLSO_SIGNING_PASSWORD','--out',str(output),str(source/'bolso-unsigned.apk')],env=env,check=True)
result=subprocess.check_output(['java','-jar',str(source/'apksigner.jar'),'verify','--verbose','--print-certs',str(output)],text=True)
expected=json.loads((root/'android/assetlinks.json').read_text())[0]['target']['sha256_cert_fingerprints'][0].replace(':','').lower()
assert expected in result.lower(), 'O certificado não corresponde ao domínio'
(root/'outputs/bolso-signature-verification.txt').write_text(result)
digest=hashlib.sha256(output.read_bytes()).hexdigest()
(root/'outputs/bolso-1.0.0.apk.sha256').write_text(digest+'  bolso-1.0.0.apk\n')
with zipfile.ZipFile(root/'outputs/bolso-signing-backup-PRIVATE.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for name in ['bolso-release.p12','credentials.json']:
        archive.write(root/'.android-signing'/name,name)
(root/'outputs/bolso-signing-backup-PRIVATE.zip').chmod(0o600)
print(json.dumps({'apk':str(output),'bytes':output.stat().st_size,'sha256':digest,'signatureVerified':True}))
