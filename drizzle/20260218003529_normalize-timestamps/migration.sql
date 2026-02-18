UPDATE actionData
SET
  createdAt = REPLACE(REPLACE(createdAt, ' +00:00', 'Z'), ' ', 'T'),
  updatedAt = REPLACE(REPLACE(updatedAt, ' +00:00', 'Z'), ' ', 'T')
WHERE createdAt LIKE '% +00:00' OR updatedAt LIKE '% +00:00';--> statement-breakpoint
UPDATE botData
SET
  createdAt = REPLACE(REPLACE(createdAt, ' +00:00', 'Z'), ' ', 'T'),
  updatedAt = REPLACE(REPLACE(updatedAt, ' +00:00', 'Z'), ' ', 'T')
WHERE createdAt LIKE '% +00:00' OR updatedAt LIKE '% +00:00';--> statement-breakpoint
UPDATE userSessions
SET
  createdAt = REPLACE(REPLACE(createdAt, ' +00:00', 'Z'), ' ', 'T'),
  updatedAt = REPLACE(REPLACE(updatedAt, ' +00:00', 'Z'), ' ', 'T')
WHERE createdAt LIKE '% +00:00' OR updatedAt LIKE '% +00:00';