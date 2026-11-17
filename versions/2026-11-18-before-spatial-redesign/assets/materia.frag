
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_mode;
uniform float u_pulse;
uniform float u_energy;
#define MAX_STEPS 58
#define MAX_DIST 28.0
#define SURF_DIST 0.0018
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.0)/k;return min(a,b)-h*h*k*0.25;}
float sdSphere(vec3 p,float r){return length(p)-r;}
float sdOcta(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*0.57735027;}
vec3 spin(vec3 p,float a){p.xz=rot(a)*p.xz;p.xy=rot(a*.71)*p.xy;return p;}
vec2 sceneMap(vec3 p){
 float t=u_time;
 vec3 q=spin(p,t*.17+u_mouse.x*.34);
 q.yz=rot(sin(t*.22)*.24+u_mouse.y*.16)*q.yz;
 float base=sdSphere(q,.70+.035*sin(t*1.3));
 for(int i=0;i<6;i++){
  float fi=float(i);float a=fi*6.2831853/6.0+t*.23;
  vec3 c=vec3(cos(a)*.68,sin(a*2.0+t*.27)*.30,sin(a)*.68);
  float r=.43+.055*sin(t*1.7+fi*1.8);
  base=smin(base,sdSphere(q-c,r),.37);
 }
 float ripple=sin(q.x*5.8+t*1.3+sin(q.z*3.0))*sin(q.y*6.2-t*.9)*sin(q.z*5.1+t*.7);
 base+=ripple*(.038+u_energy*.012);
 base-=exp(-max(0.0,t-u_pulse)*2.4)*.055;
 if(u_mode>.5&&u_mode<1.5){
  float crystal=sdOcta(q,1.36+.04*sin(t*.7));
  float facets=length(q)-(.96+.10*cos(q.x*3.0)*cos(q.y*3.0)*cos(q.z*3.0));
  base=mix(base,smin(crystal,facets,.18),.73);
 }
 if(u_mode>1.5){base+=.105*sin(q.x*10.0+t*2.1)*sin(q.y*9.0-t*1.7)*sin(q.z*11.0+t);base+=.055*sin(q.x*19.0+q.y*13.0-t*2.0);}
 vec2 res=vec2(base,1.0);
 // Tiny droplets orbit the body; their positions are computed, not loaded.
 for(int i=0;i<7;i++){
  float fi=float(i);float a=fi*6.2831853/7.0+t*(.22+fi*.003)*(mod(fi,2.0)*2.0-1.0);
  float radius=1.22+.18*sin(t*.75+fi*1.9)+(u_mode>1.5?.25:0.0);
  vec3 c=vec3(cos(a)*radius,sin(a*2.0+t*.35)*(.34+.04*fi),sin(a)*radius*.82);
  float dr=.047+.025*(.5+.5*sin(fi*3.1+t*1.4));
  if(u_mode>1.5)dr*=.72;
  float dd=sdSphere(p-c,dr);
  if(dd<res.x)res=vec2(dd,2.0);
 }
 // Isolated liquid object — no floor or rings so pixels outside geometry stay transparent.

 return res;
}
vec3 normalAt(vec3 p){vec2 e=vec2(.0015,0.0);return normalize(vec3(sceneMap(p+e.xyy).x-sceneMap(p-e.xyy).x,sceneMap(p+e.yxy).x-sceneMap(p-e.yxy).x,sceneMap(p+e.yyx).x-sceneMap(p-e.yyx).x));}
vec3 env(vec3 r){
 float a=atan(r.z,r.x);
 vec3 sky=mix(vec3(.006,.012,.022),vec3(.055,.105,.12),smoothstep(-.65,.75,r.y));
 float softbox=exp(-pow((r.y-.31-.09*sin(a*1.7)),2.0)*155.0);
 float softbox2=exp(-pow((r.y+.19),2.0)*310.0)*smoothstep(-.4,.85,sin(a*2.1+.8));
 float strip=pow(max(0.0,cos(a*4.0+r.y*2.3)),34.0);
 float warm=exp(-pow((r.y-.64),2.0)*230.0)*pow(max(0.0,sin(a*1.3)),4.0);
 sky+=softbox*vec3(.75,.91,.88)*.92;
 sky+=softbox2*vec3(.18,.52,.36)*.9;
 sky+=strip*vec3(.55,.80,.65)*.44;
 sky+=warm*vec3(.95,.47,.22)*.28;
 sky+=pow(max(r.y,0.0),8.0)*vec3(.1,.3,.34);
 return sky;
}
vec3 background(vec3 rd,vec2 uv){return vec3(.05,.11,.08);}
vec3 shade(vec3 p,vec3 n,vec3 rd,float matId,vec2 uv){
 vec3 v=normalize(-rd);vec3 refl=reflect(rd,n);vec3 e=env(refl);
 float ndv=max(dot(n,v),0.0);float fres=pow(1.0-ndv,5.0);
 vec3 key=normalize(vec3(-.45,.82,.55));vec3 fill=normalize(vec3(.75,.22,-.6));
 float diff=max(dot(n,key),0.0);float dif2=max(dot(n,fill),0.0);
 float sh=.88;
 float spec=pow(max(dot(reflect(-key,n),v),0.0),80.0)*sh;
 float spec2=pow(max(dot(reflect(-fill,n),v),0.0),36.0);
 if(matId<1.5){
  vec3 metal=e*1.02;
  metal*=.72+.28*sin(p.y*2.2+u_time*.4);
  metal+=vec3(.025,.07,.075)*diff*.5;
  metal+=vec3(1.0,.82,.63)*spec*.8+vec3(.25,.65,.44)*spec2*.34;
  metal=mix(metal,vec3(.52,.76,.60),fres*.48);
  metal+=vec3(.02,.09,.1)*pow(1.0-ndv,2.0);
  return metal;
 }
 if(matId<2.5){vec3 c=e*1.22+vec3(.30,.62,.44)*(.15+spec2*.65);return mix(c,vec3(.65,1.0,.95),fres*.55);}
 return e;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*u_resolution.xy)/u_resolution.y;
 float t=u_time;
 vec2 m=u_mouse;
 float angle=m.x*.72+sin(t*.13)*.04;
 vec3 ro=vec3(sin(angle)*4.8,.15+m.y*.75,cos(angle)*4.8);
 vec3 ta=vec3(0.0,-.08,0.0);
 vec3 ww=normalize(ta-ro);vec3 uu=normalize(cross(ww,vec3(0.0,1.0,0.0)));vec3 vv=cross(uu,ww);
 vec3 rd=normalize(uv.x*uu+uv.y*vv+1.45*ww);
 vec3 col=vec3(0.0);
 float dO=0.0;float matId=0.0;vec3 p=ro;bool hit=false;
 for(int i=0;i<MAX_STEPS;i++){
  p=ro+rd*dO;vec2 h=sceneMap(p);matId=h.y;
  if(h.x<SURF_DIST){hit=true;break;}
  dO+=h.x*.86;
  if(dO>MAX_DIST)break;
 }
 if(hit){
  vec3 n=normalAt(p);
  col=shade(p,n,rd,matId,uv);
  float fog=1.0-exp(-dO*.028);col=mix(col,vec3(.08,.16,.12),fog*.22);
  float edge=pow(1.0-max(dot(n,-rd),0.0),2.4);
  col+=vec3(.02,.12,.07)*edge*.32;
 }
 float pulse=exp(-max(0.0,t-u_pulse)*2.4);
 float halo=exp(-length(uv)*2.3);
 col+=vec3(.015,.13,.15)*halo*(.22+pulse*.9);
 // Fine cinematic scan of light, restrained so it never becomes a filter.
 float scan=.5+.5*sin(gl_FragCoord.y*.75+t*1.2);col*=.988+.012*scan;
 col=col/(1.0+col*.16);
 col=pow(max(col,0.0),vec3(.92));
 float vign=1.0-smoothstep(.42,1.15,length(uv));col*=.62+.38*vign;
 gl_FragColor=vec4(col,hit ? 1.0 : 0.0);
}