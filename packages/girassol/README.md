# 🌻 Girassol

Pacote independente de componentes e tokens, sem imports ou conhecimento do Jardim.
O código está no monorepo; a publicação npm e um repositório próprio continuam separados desta entrega.

```tsx
import '@rodkisten/girassol/tokens.css';
import { Button, Input, Card, Badge } from '@rodkisten/girassol';

<Card label="Uma memória">
  <Badge>Diário</Badge>
  <label for="memory">Título</label>
  <Input id="memory" name="memory" />
  <Button type="submit">Guardar</Button>
</Card>;
```

Solid 2 RC.21, TSX, CSS Modules, temas por `prefers-color-scheme`, foco visível e elementos HTML nativos. Botões têm alvo mínimo de 44px. Tokens são CSS custom properties `--g-*` e podem ser sobrescritos pelo consumidor. O pacote não define regras globais para os componentes da aplicação.

A galeria integrada ao Jardim permite conferir os componentes. A validação em VoiceOver e Safari iPhone ainda precisa ocorrer em dispositivo real.
