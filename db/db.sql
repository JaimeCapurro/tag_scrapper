/* PROCEDIMIENTOS ALMACENADO AMBOS FUNCIONAN */

USE testing;
 DELIMITER //
 CREATE PROCEDURE pa_insertarDatos(
 in _fecha varchar(30),
 in _hora varchar(30),
 in _patente varchar(30),
 in _portico varchar(30),
 in _monto varchar(30)
 )
 BEGIN
 INSERT INTO registroTags(Fecha, Hora, Patente, Portico, Monto) VALUES (_fecha, _hora, _patente, _portico, _monto);
 
 WITH RECURSIVE C AS(
 SELECT Id, Fecha, Hora, Patente, Portico, Monto, ROW_NUMBER() OVER (PARTITION BY 
 Patente, Fecha, Hora ORDER BY Id)AS DUPLICADO FROM registroTags)
 DELETE FROM registroTags WHERE Id IN (SELECT Id FROM C WHERE DUPLICADO > 1);
 END //

 -----------------------------------------------------------------------------------------------------------------------

USE testing;
 DELIMITER $$
CREATE PROCEDURE pa_insertarDatosNest(
IN _fecha varchar(80), 
IN _hora varchar(80), 
IN _patente varchar(80), 
IN _portico varchar(80), 
IN _monto varchar(80),
IN _concesion varchar(80)
)
BEGIN
    INSERT INTO peticiones (Fecha, Hora, Patente, Portico, Monto, Concesion ) 
    SELECT _fecha, _hora, _patente, _portico, _monto, _concesion
    FROM DUAL
    WHERE NOT EXISTS (
        SELECT id FROM peticiones 
        WHERE Fecha = _fecha AND Hora = _hora AND Patente = _patente AND Portico = _portico AND Monto = _monto
    );
END$$

 -----------------------------------------------------------------------------------------------------------------------

/* SI ARROJA ALGUN ERROR DIRIGIRSE POR CONSOLA AL DIRECTORIO: "/Applications/XAMPP/xamppfiles/bin" Y EJECUTAR EL COMANDO "sudo ./mysql_upgrade" EN MacOS */