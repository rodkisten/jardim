import { useState } from 'react';
const planets={Sol:'sun',Lua:'moon',Mercúrio:'mercury',Vênus:'venus',Marte:'mars',Júpiter:'jupiter',Saturno:'saturn',Urano:'uranus',Netuno:'neptune',Plutão:'pluto'} as const;
const zodiac=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'] as const;
const aspects={Conjunção:'conjunction',Oposição:'opposition',Trígono:'trine',Quadratura:'square',Sextil:'sextile'} as const;
export type AstroIconName=`planets/${typeof planets[keyof typeof planets]}`|`zodiac/${typeof zodiac[number]}`|`aspects/${typeof aspects[keyof typeof aspects]}`|'mystical/crystals'|'mystical/celestial-globe'|'mystical/triple-moon'|'mystical/oracle-book';
export function planetIcon(name:string):AstroIconName|undefined{const key=planets[name as keyof typeof planets];return key?`planets/${key}`:undefined;}
export function aspectIcon(name:string):AstroIconName|undefined{const key=aspects[name as keyof typeof aspects];return key?`aspects/${key}`:undefined;}
export function AstroIcon({name,size=32,fallback='✦'}:{name?:AstroIconName;size?:number;fallback?:string}){const [failed,setFailed]=useState<string>();return <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle" style={{width:size,height:size}}>{name&&failed!==name?<img src={'/icons/astro/'+name+'.webp'} alt="" width={size} height={size} className="size-full object-contain" decoding="async" onError={()=>setFailed(name)}/>:<span className="text-violet-300">{fallback}</span>}</span>;}
