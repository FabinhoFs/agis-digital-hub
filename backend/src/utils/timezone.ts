import { config } from '../config';

/**
 * Converte uma data UTC para o timezone da aplicação (America/Sao_Paulo).
 * Uso apenas na camada de apresentação/resposta da API.
 */
export function toLocalISO(date: Date): string {
  return date.toLocaleString('sv-SE', {
    timeZone: config.appTimezone,
  }).replace(' ', 'T') + getTimezoneOffset(date);
}

/**
 * Retorna o offset do timezone em formato ISO 8601 (ex: -03:00)
 */
function getTimezoneOffset(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.appTimezone,
    timeZoneName: 'shortOffset',
  });

  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find(p => p.type === 'timeZoneName');
  const offset = offsetPart?.value || 'GMT';

  // Parse "GMT-3" → "-03:00"
  const match = offset.match(/GMT([+-]?)(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return '+00:00';

  const sign = match[1] || '+';
  const hours = match[2].padStart(2, '0');
  const minutes = (match[3] || '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/**
 * Retorna a data atual em UTC.
 */
export function nowUTC(): Date {
  return new Date();
}
