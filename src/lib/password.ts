import{randomBytes,scrypt as callback,timingSafeEqual}from"node:crypto";import{promisify}from"node:util";const scrypt=promisify(callback);
export async function hashPassword(password:string){const salt=randomBytes(16).toString("hex"),derived=await scrypt(password,salt,64)as Buffer;return`scrypt:${salt}:${derived.toString("hex")}`}
export async function verifyPassword(password:string,stored:string){const[algorithm,salt,hash]=stored.split(":");if(algorithm!=="scrypt"||!salt||!hash)return false;const derived=await scrypt(password,salt,64)as Buffer,expected=Buffer.from(hash,"hex");return expected.length===derived.length&&timingSafeEqual(expected,derived)}

