# Movement jumpiness root cause

The v3.2.0 client advanced movement once per rendered frame, which made movement speed and reconciliation behavior depend on display refresh rate. A rotation action could also overwrite the server acknowledgement used by the movement-only reconciliation queue. When that timestamp did not match a queued movement action, the client could replay already-processed commands and then hard-snap even small discrepancies.

Version 3.3.0 replaces that path with fixed 60 Hz simulation, 30 Hz authoritative snapshots, movement-only acknowledgements, bounded replay, frame-rate-independent interpolation, and soft correction for ordinary network differences.
