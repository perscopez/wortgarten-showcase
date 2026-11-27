/** Cloudflare's fetch accepts follow/manual, not redirect:error. Never follow a
 * push endpoint redirect: credentials and ciphertext must stay at that endpoint. */
export async function deliverPushRequest(endpoint:string,payload:RequestInit,request:typeof fetch=fetch){return request(endpoint,{...payload,redirect:'manual',signal:AbortSignal.timeout(15000)})}
