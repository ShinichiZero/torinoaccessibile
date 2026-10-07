export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div className="app-footer__main">
          <div>
            <strong>
              Torino Accessibile
            </strong>

            <p>
              Progetto open-source dedicato alla
              consultazione di dati sull'accessibilità
              urbana di Torino.
            </p>
          </div>

          <div className="app-footer__sources">
            <strong>Fonti dati</strong>

            <p>
              Data © OpenStreetMap contributors
            </p>

            <p>
              Dataset GTT/5T
            </p>
          </div>
        </div>

        <div className="app-footer__disclaimer">
          <strong>
            Disclaimer
          </strong>

          <p>
            Le informazioni riportate in questa
            applicazione sono fornite a scopo informativo
            e possono essere inesatte, incomplete o non
            aggiornate rispetto alle condizioni
            effettivamente presenti sul territorio.
            Prima di intraprendere uno spostamento,
            verificare sempre sul posto la reale
            accessibilità delle strutture e dei percorsi.
            Il progetto non garantisce la disponibilità,
            l'accessibilità o lo stato di funzionamento
            delle infrastrutture indicate e non assume
            responsabilità per eventuali disagi, danni
            o conseguenze derivanti dall'utilizzo dei dati.
          </p>
        </div>

        <div className="app-footer__bottom">
          <span>
            Progetto open-source
          </span>

          <span>
            Licenza MIT
          </span>
        </div>
      </div>
    </footer>
  );
}