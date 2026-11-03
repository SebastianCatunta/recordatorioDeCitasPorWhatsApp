CREATE TABLE IF NOT EXISTS reminders_sent (
  event_uid  text        NOT NULL,
  event_date date        NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_uid, event_date)
);
