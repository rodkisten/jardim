import { Moon, Sun, Monitor } from "lucide-react";
import { Card, CardContent, Button } from "@rodkisten/girassol/react";
import { useTheme } from "../hooks/useTheme";
const options=[{value:"dark",label:"Escuro",Icon:Moon},{value:"light",label:"Claro",Icon:Sun},{value:"system",label:"Sistema",Icon:Monitor}] as const;
export function ThemePicker(){const {mode,setTheme}=useTheme();return <Card><CardContent className="space-y-3"><h2 className="font-semibold">Aparência</h2><div role="group" aria-label="Tema" className="grid grid-cols-3 gap-2">{options.map(({value,label,Icon})=><Button key={value} variant={mode===value?"default":"outline"} aria-pressed={mode===value} onClick={()=>setTheme(value)}><Icon className="size-4"/>{label}</Button>)}</div></CardContent></Card>;}
