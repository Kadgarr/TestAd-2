(function(){
var W=window,DOC=document;
if(!/^(https?|file):$/.test(location.protocol)){var bs=DOC.createElement('base');bs.href='https://localhost/';DOC.head.appendChild(bs)}
var s=atob(W.__P),n=s.length,z=new Uint8Array(n),i;for(i=0;i<n;i++)z[i]=s.charCodeAt(i);s=null;W.__P=null;
var D=__inflate(z,__TOTAL__),M=__MANIFEST__,TC={},UC={};
var TD=typeof TextDecoder!=='undefined'?new TextDecoder('utf-8'):null;
function key(u){if(typeof u!=='string')return null;u=u.split('#')[0].split('?')[0];var p=u.split('/');for(var j=0;j<p.length;j++){var c=p.slice(j).join('/');if(M[c])return c}return null}
function bytes(k){var e=M[k];return D.subarray(e[0],e[0]+e[1])}
function txt(k){if(TC[k]!=null)return TC[k];var b=bytes(k),r;if(TD)r=TD.decode(b);else{r='';for(var j=0;j<b.length;j+=32768)r+=String.fromCharCode.apply(null,b.subarray(j,j+32768));r=decodeURIComponent(escape(r))}return TC[k]=r}
function mime(k){var x=k.slice(k.lastIndexOf('.')+1).toLowerCase();return({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',json:'application/json',js:'text/javascript'})[x]||'application/octet-stream'}
function durl(k){if(UC[k])return UC[k];var b=bytes(k),r='';for(var j=0;j<b.length;j+=32768)r+=String.fromCharCode.apply(null,b.subarray(j,j+32768));return UC[k]='data:'+mime(k)+';base64,'+btoa(r)}
W.__inlineRes={key:key,bytes:bytes,text:txt};
function hook(proto,prop,fn){var d=Object.getOwnPropertyDescriptor(proto,prop);if(!d||!d.set)return;Object.defineProperty(proto,prop,{configurable:true,enumerable:d.enumerable,get:function(){return this.__src||d.get.call(this)},set:function(v){var k=key(v);if(k){this.__src=v;fn(this,k,d)}else d.set.call(this,v)}})}
hook(HTMLImageElement.prototype,'src',function(el,k,d){d.set.call(el,durl(k))});
hook(HTMLMediaElement.prototype,'src',function(el,k,d){d.set.call(el,durl(k))});
hook(HTMLScriptElement.prototype,'src',function(el,k){el.__ik=k});
function wrapIns(orig){return function(el){if(el&&el.__ik&&!el.__idone){el.__idone=1;el.text=txt(el.__ik)+'\n//# sourceURL='+el.__ik;var r=orig.apply(this,arguments);setTimeout(function(){el.dispatchEvent(new Event('load'))},0);return r}return orig.apply(this,arguments)}}
Node.prototype.appendChild=wrapIns(Node.prototype.appendChild);
Node.prototype.insertBefore=wrapIns(Node.prototype.insertBefore);
var XP=W['XMLHttp'+'Request'].prototype,XO=XP.open,XS=XP.send;
function def(o,p,v){Object.defineProperty(o,p,{configurable:true,value:v})}
XP.open=function(m,u){this.__ik=key(u);if(!this.__ik)return XO.apply(this,arguments)};
XP.send=function(){var x=this,k=x.__ik;if(!k)return XS.apply(this,arguments);
setTimeout(function(){var rt=x.responseType,res;
if(rt==='arraybuffer'){var b=bytes(k);res=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
else if(rt==='json'){res=JSON.parse(txt(k))}
else if(rt==='blob'){res=new Blob([bytes(k)],{type:mime(k)})}
else{res=txt(k);def(x,'responseText',res)}
def(x,'readyState',4);def(x,'status',200);def(x,'statusText','OK');def(x,'response',res);
x.dispatchEvent(new Event('readystatechange'));x.dispatchEvent(new ProgressEvent('load'));x.dispatchEvent(new ProgressEvent('loadend'))},0)};
if(W.fetch){var F=W.fetch;W.fetch=function(u,o){var k=key(typeof u==='string'?u:(u&&u.url));if(!k)return F.apply(this,arguments);return Promise.resolve(new Response(bytes(k),{status:200,headers:{'Content-Type':mime(k)}}))}}
})();
