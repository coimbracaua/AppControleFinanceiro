export const INSTALL_ORIGINS=['https://appfinanceiro-rust-six.vercel.app','https://appfinanceiro-coimbracaua.vercel.app'];
const CHECKS=[['/','text/html'],['/manifest.webmanifest','application/manifest+json'],['/icons/icon-512.png','image/png'],['/sw.js','javascript']];
export async function checkInstallation(fetcher=fetch){
 const results=await Promise.all(INSTALL_ORIGINS.map(async origin=>{
  const assets=await Promise.all(CHECKS.map(async([path,type])=>{try{const response=await fetcher(origin+path,{redirect:'manual',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(8000)});const contentType=response.headers.get('content-type')||'';await response.body?.cancel();return{path,status:response.status,ok:response.status===200&&contentType.includes(type)}}catch{return{path,status:0,ok:false}}}));
  return{origin,installable:assets.every(a=>a.ok),assets};
 }));return{results};
}
