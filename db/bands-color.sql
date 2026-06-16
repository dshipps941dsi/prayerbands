-- A band is either a themed design (theme, e.g. 'baseball') OR a solid color
-- (color, e.g. 'Black' / 'Teal' / '#FF66AA'). The production batch generator
-- writes `color` for solid runs; it stays null for themed bands. The value is a
-- free label/hex the manufacturer uses to pick band stock.
ALTER TABLE bands ADD COLUMN IF NOT EXISTS color TEXT;
