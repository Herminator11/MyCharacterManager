/**
 * Ersatz für das `server-only`-Paket im Testlauf.
 *
 * Das echte Paket wirft beim Import außerhalb einer Server-Umgebung — genau
 * dafür ist es da. Im Node-Testlauf wollen wir die Server-Module aber gerade
 * direkt ansprechen, deshalb hier ein leeres Modul.
 */
export {};
