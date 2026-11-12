import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {createApp} from './vercel-core.js';
const store={
 async read(path){const r=await get(path,{access:'private',useCache:false});if(!r)return null;return {value:await new Response(r.stream).json(),etag:r.blob.etag}},
 async write(path,value,etag){return put(path,JSON.stringify(value),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{})})},
 conflict(error){return error instanceof BlobPreconditionFailedError||/already exists/i.test(error.message)}
};
export const handler=createApp(store,{setupHost:'appfinanceiro-coimbracaua.vercel.app'});
