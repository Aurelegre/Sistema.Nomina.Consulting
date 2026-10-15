-- CreateTable
CREATE TABLE `periodo_nomina` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mes` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `estado` ENUM('ABIERTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_cierre` DATETIME(3) NULL,

    UNIQUE INDEX `uq_periodo_nomina_mes_anio`(`mes`, `anio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
