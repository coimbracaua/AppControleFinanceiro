import os,secrets,json,subprocess,pathlib,hashlib,base64
root=pathlib.Path('.android-signing')
config=root/'credentials.json'
if config.exists():
    credentials=json.loads(config.read_text())
else:
    credentials={'alias':'bolso','password':secrets.token_urlsafe(40)}
    config.write_text(json.dumps(credentials))
    config.chmod(0o600)
env=os.environ.copy();env['BOLSO_SIGNING_PASSWORD']=credentials['password']
keystore=root/'bolso-release.p12'
if not keystore.exists():
    subprocess.run(['keytool','-genkeypair','-keystore',str(keystore),'-storetype','PKCS12','-alias',credentials['alias'],'-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Bolso, OU=Aplicativo pessoal, O=CoimbraCaua, C=BR','-storepass:env','BOLSO_SIGNING_PASSWORD'],env=env,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    keystore.chmod(0o600)
cert=subprocess.check_output(['keytool','-exportcert','-keystore',str(keystore),'-alias',credentials['alias'],'-storepass:env','BOLSO_SIGNING_PASSWORD'],env=env)
fingerprint=':'.join(hashlib.sha256(cert).hexdigest().upper()[i:i+2] for i in range(0,64,2))
links=[{'relation':['delegate_permission/common.handle_all_urls'],'target':{'namespace':'android_app','package_name':'br.com.coimbracaua.bolso','sha256_cert_fingerprints':[fingerprint]}}]
pathlib.Path('android/assetlinks.json').write_text(json.dumps(links,indent=2)+'\n')
print('Chave privada preservada localmente; certificado público preparado.')
