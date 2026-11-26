import { Body, GeoVector, Ecliptic, MoonPhase, Illumination } from 'astronomy-engine';
export const signs=['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'] as const;
export const glyphs=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const bodies=[ [Body.Sun,'Sol','☉'],[Body.Moon,'Lua','☽'],[Body.Mercury,'Mercúrio','☿'],[Body.Venus,'Vênus','♀'],[Body.Mars,'Marte','♂'],[Body.Jupiter,'Júpiter','♃'],[Body.Saturn,'Saturno','♄'],[Body.Uranus,'Urano','♅'],[Body.Neptune,'Netuno','♆'],[Body.Pluto,'Plutão','♇']] as const;
const norm=(n:number)=>(n%360+360)%360;
export function calculateSky(instant:string){const date=new Date(instant);if(!Number.isFinite(date.getTime())||date.getUTCFullYear()<1600||date.getUTCFullYear()>2200)throw Error('Data fora do intervalo suportado (1600–2200).');const positions=bodies.map(([body,name,glyph])=>{const longitude=norm(Ecliptic(GeoVector(body,date,true)).elon);return {name,glyph,longitude,sign:signs[Math.floor(longitude/30)],degree:longitude%30};});const phase=MoonPhase(date);return {positions,phase,illumination:Illumination(Body.Moon,date).phase_fraction};}
