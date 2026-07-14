export const SESSION_COOKIE="iceberry_session";export type SessionPayload={userId:string;role:string;exp:number};
const bytes=(s:string)=>new TextEncoder().encode(s);const b64=(data:ArrayBuffer|Uint8Array)=>{const a=data instanceof Uint8Array?data:new Uint8Array(data);let s="";for(const b of a)s+=String.fromCharCode(b);return btoa(s).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")};
const unb64=(s:string)=>{const value=s.replaceAll("-","+").replaceAll("_","/");const raw=atob(value+"=".repeat((4-value.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
async function sign(value:string,secret:string){const key=await crypto.subtle.importKey("raw",bytes(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64(await crypto.subtle.sign("HMAC",key,bytes(value)))}
export async function createSessionToken(payload:SessionPayload,secret:string){const body=b64(bytes(JSON.stringify(payload)));return`${body}.${await sign(body,secret)}`}
export async function verifySessionToken(token:string|undefined,secret:string):Promise<SessionPayload|null>{try{if(!token)return null;const[body,sig]=token.split(".");if(!body||!sig||await sign(body,secret)!==sig)return null;const payload=JSON.parse(new TextDecoder().decode(unb64(body)))as SessionPayload;return payload.exp>Date.now()?payload:null}catch{return null}}

