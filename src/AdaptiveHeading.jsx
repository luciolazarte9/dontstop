import React, {useLayoutEffect,useRef,useState} from 'react';
// Keep comfortable typography; very long names wrap after reaching the minimum.
export default function AdaptiveHeading({as:Tag='h2',children,measureText=children,className='',min=24}) {
 const host=useRef(null),probe=useRef(null),[size,setSize]=useState(null);
 useLayoutEffect(()=>{
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');let active=true;
  const fit=()=>{
   if(!active||!host.current||!probe.current||!context)return;
   const style=getComputedStyle(probe.current),max=parseFloat(style.fontSize),spacing=parseFloat(style.letterSpacing)||0;
   context.font=`${style.fontStyle} ${style.fontWeight} ${max}px ${style.fontFamily}`;
   const values=String(measureText??'').split('\n'),width=Math.max(...values.map(value=>context.measureText(value).width+Math.max(0,value.length-1)*spacing));
   setSize(Math.max(min,Math.min(max,width?max*(Math.max(0,host.current.clientWidth-4)/width):max)));
  };
  fit();const observer=new ResizeObserver(fit);observer.observe(host.current);
  window.addEventListener('resize',fit);document.fonts?.ready.then(fit);
  return()=>{active=false;observer.disconnect();window.removeEventListener('resize',fit)};
 },[measureText,min]);
 return <Tag ref={host} className={`adaptive-heading ${className}`} style={size?{fontSize:`${size}px`}:undefined}><span className="heading-size-probe" ref={probe} aria-hidden="true">M</span>{children}</Tag>;
}
