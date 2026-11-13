# Bolso para Android

Pacote Android **br.com.coimbracaua.bolso**, com nome e ícone próprios no launcher. Usa uma Trusted Web Activity do Android Browser Helper para abrir o app hospedado em https://appfinanceiro-rust-six.vercel.app/.

A instalação por arquivo APK não depende da criação de WebAPK pelo Chrome. O conteúdo continua sendo o app web e precisa de conexão para consultar ou salvar dados. Recomenda-se Chrome atualizado; o navegador preserva suas funções de importação, download, login e exportação. Se a validação de domínio ainda não tiver concluído, o navegador pode exibir uma barra de endereço.

## Requisitos

- Android 8.0 (API 26) ou superior.
- Navegador com suporte a Custom Tabs/TWA, preferencialmente Chrome.
- Para compilar: JDK 17, Gradle 8.13, Android SDK Platform 36 e Build Tools 36.0.0.

## Build

Na raiz do repositório:

```sh
node scripts/build-vercel.mjs
node scripts/android-assets.mjs
gradle -p android :app:assembleRelease :app:assembleDebug
```

O workflow `.github/workflows/android-apk.yml` compila o APK e verifica a instalação e a resolução da Activity de launcher em um emulador Android. O artefato `bolso-android-unsigned` contém o APK de release ainda **sem assinatura**, metadados e a ferramenta oficial `apksigner.jar`. Esse artefato intermediário não é o download para instalar no celular.

## Assinatura

A assinatura de release é feita fora do GitHub Actions. A chave privada e a senha ficam em `.android-signing/`, ignorado pelo Git. `scripts/android-key.py` cria ou reutiliza a chave e gera somente o certificado público em `android/assetlinks.json`. Não execute esse script em CI nem troque a chave de uma versão já instalada.

A declaração de Digital Asset Links é publicada em `/.well-known/assetlinks.json`, associando o domínio ao pacote e ao certificado público do APK. O build da Vercel copia a declaração automaticamente.

Depois de baixar e extrair o artefato de build, execute `python scripts/sign-android.py /caminho/do/artefato` no ambiente privado que mantém a chave. O script assina, verifica o certificado, gera o SHA-256 e cria um backup privado em `outputs/bolso-signing-backup-PRIVATE.zip`. Esse backup contém a chave e a senha: nunca publique no GitHub ou na hospedagem.

O arquivo final para distribuição deve ser assinado com a chave de release, verificado com `apksigner verify --verbose --print-certs` e acompanhado do SHA-256. Guarde uma cópia privada da chave e das credenciais para assinar futuras atualizações com a mesma identidade.

## Instalar

Transfira o APK final assinado para o Android e abra o arquivo. O sistema pode pedir autorização de instalação para o aplicativo que abriu o APK. Autorize apenas essa origem quando solicitado; não é necessário desativar o Play Protect. Procure **Bolso** na lista de aplicativos após a instalação. Entre com a mesma senha do app web.

O APK não recebe credenciais de banco de dados, não implementa interfaces JavaScript nativas e não tem acesso aos dados financeiros fora da sessão do navegador. Este pacote não é uma publicação na Play Store.

## Download da versão 1.0.0

APK assinado: https://appfinanceiro-rust-six.vercel.app/downloads/bolso-1.0.0.apk

A compilação e o teste de instalação em emulador são verificáveis no workflow de build indicado em `downloads/release.json`. A assinatura e o certificado foram verificados com a ferramenta oficial do Android. O teste de instalação usou a variante debug do mesmo código em Android API 30; a variante release distribuída foi assinada e verificada separadamente. O aparelho físico do usuário e o fluxo completo de login/importação/exportação no Android ainda precisam de validação.
