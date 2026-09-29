function __inflate(src,outLen){
var out=new Uint8Array(outLen),op=0,ip=0,bb=0,bc=0;
function bits(n){while(bc<n){bb|=src[ip++]<<bc;bc+=8}var v=bb&((1<<n)-1);bb>>>=n;bc-=n;return v}
function build(lens,n){var cnt=new Uint16Array(16),offs=new Uint16Array(16),sym=new Uint16Array(n),i;for(i=0;i<n;i++)cnt[lens[i]]++;cnt[0]=0;for(i=1;i<16;i++)offs[i]=offs[i-1]+cnt[i-1];for(i=0;i<n;i++)if(lens[i])sym[offs[lens[i]]++]=i;return{c:cnt,s:sym}}
function dec(t){var code=0,first=0,idx=0,len,c;for(len=1;len<16;len++){code|=bits(1);c=t.c[len];if(code-c<first)return t.s[idx+code-first];idx+=c;first+=c;first<<=1;code<<=1}throw Error("inflate")}
var LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],
DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],
CL=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
var fl=new Uint8Array(288),i;for(i=0;i<144;i++)fl[i]=8;for(;i<256;i++)fl[i]=9;for(;i<280;i++)fl[i]=7;for(;i<288;i++)fl[i]=8;
var FL=build(fl,288),fd=new Uint8Array(30);fd.fill(5);var FD=build(fd,30);
var fin,type;
do{fin=bits(1);type=bits(2);
if(type===0){bb=0;bc=0;var len=src[ip]|src[ip+1]<<8;ip+=4;out.set(src.subarray(ip,ip+len),op);ip+=len;op+=len;continue}
var lt,dt;
if(type===1){lt=FL;dt=FD}else{
var hl=bits(5)+257,hd=bits(5)+1,hc=bits(4)+4,cl=new Uint8Array(19);
for(i=0;i<hc;i++)cl[CL[i]]=bits(3);var ct=build(cl,19),ll=new Uint8Array(hl+hd),n=0;
while(n<hl+hd){var s=dec(ct);if(s<16)ll[n++]=s;else{var r,v=0;if(s===16){v=ll[n-1];r=3+bits(2)}else if(s===17)r=3+bits(3);else r=11+bits(7);while(r--)ll[n++]=v}}
lt=build(ll.subarray(0,hl),hl);dt=build(ll.subarray(hl),hd)}
for(;;){var sy=dec(lt);if(sy<256)out[op++]=sy;else if(sy===256)break;else{sy-=257;var L=LB[sy]+bits(LE[sy]),ds=dec(dt),D=DB[ds]+bits(DE[ds]);for(var k=0;k<L;k++,op++)out[op]=out[op-D]}}
}while(!fin);
return out}
