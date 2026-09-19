/*
  Warnings:

  - A unique constraint covering the columns `[jefe_id]` on the table `departamento` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `departamento` ADD COLUMN `jefe_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `empleado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `fecha_ingreso` DATE NOT NULL,
    `fecha_salida` DATE NULL,
    `salario_base` DECIMAL(12, 2) NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `departamento_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,

    UNIQUE INDEX `empleado_codigo_key`(`codigo`),
    INDEX `empleado_departamento_id_idx`(`departamento_id`),
    INDEX `empleado_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `departamento_jefe_id_key` ON `departamento`(`jefe_id`);

-- CreateIndex
CREATE INDEX `departamento_jefe_id_idx` ON `departamento`(`jefe_id`);

-- AddForeignKey
ALTER TABLE `departamento` ADD CONSTRAINT `departamento_jefe_id_fkey` FOREIGN KEY (`jefe_id`) REFERENCES `empleado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `empleado` ADD CONSTRAINT `empleado_departamento_id_fkey` FOREIGN KEY (`departamento_id`) REFERENCES `departamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
