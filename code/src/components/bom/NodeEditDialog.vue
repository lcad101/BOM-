<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBomStore } from '@/stores/bomStore';
import type { BomNode, NodeType } from '@/types/bom';

const props = defineProps<{
  visible: boolean;
  parentNode: BomNode | null;
  mode: 'add-child' | 'add-component' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm'): void;
}>();

const bomStore = useBomStore();

const formData = ref({
  level: 0,
  partNumber: '',
  referenceDesignator: '',
  name: '',
  quantity: 1,
  unit: 'PCS',
  nodeType: 'assembly' as NodeType,
  process: '',
  sortOrder: 0,
  notes: '',
});

const formRef = ref();

const rules = {
  name: [
    { required: true, message: '请输入节点名称', trigger: 'blur' },
    { min: 1, max: 100, message: '名称长度为1-100个字符', trigger: 'blur' },
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' },
    { type: 'number' as const, min: 1, message: '数量必须大于0', trigger: 'blur' },
  ],
};

const dialogTitle = computed(() => {
  if (props.mode === 'add-child') return '编辑节点';
  if (props.mode === 'add-component') return '编辑节点';
  return '编辑节点';
});

const isEditMode = computed(() => props.mode === 'edit');

watch(() => props.visible, (val) => {
  if (val) {
    if (props.parentNode) {
      formData.value.name = props.parentNode.name;
      formData.value.nodeType = props.parentNode.nodeType;
      formData.value.quantity = props.parentNode.quantity;
      formData.value.unit = props.parentNode.unit;
      formData.value.level = props.parentNode.level;
      formData.value.sortOrder = props.parentNode.sortOrder;
      formData.value.partNumber = props.parentNode.partNumber || '';
      formData.value.referenceDesignator = props.parentNode.referenceDesignator || '';
      formData.value.process = props.parentNode.process || '';
      formData.value.notes = props.parentNode.notes || '';
    } else {
      formData.value = { level: 0, partNumber: '', referenceDesignator: '', name: '', quantity: 1, unit: 'PCS', nodeType: 'assembly', process: '', sortOrder: 0, notes: '' };
    }
  }
});

async function handleConfirm() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  if (isEditMode.value && props.parentNode) {
    await bomStore.updateNode({
      nodeId: props.parentNode.id,
      level: formData.value.level,
      name: formData.value.name,
      quantity: formData.value.quantity,
      unit: formData.value.unit,
      referenceDesignator: formData.value.referenceDesignator,
      sortOrder: formData.value.sortOrder,
      partNumber: formData.value.partNumber,
      process: formData.value.process,
      notes: formData.value.notes,
    });
  } else if (bomStore.currentVersion) {
    await bomStore.addNode({
      versionId: bomStore.currentVersion.id,
      parentId: props.parentNode?.id || null,
      nodeType: formData.value.nodeType,
      name: formData.value.name,
      quantity: formData.value.quantity,
      unit: formData.value.unit,
      referenceDesignator: formData.value.referenceDesignator,
      level: formData.value.level,
      sortOrder: formData.value.sortOrder,
      partNumber: formData.value.partNumber,
      process: formData.value.process,
      notes: formData.value.notes,
    });
  }

  emit('confirm');
}

function handleClose() { emit('update:visible', false); }
</script>

<template>
  <el-dialog :model-value="visible" title="编辑节点" width="500px" @close="handleClose">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px" label-position="right">
      <el-form-item label="层级" prop="level">
        <el-input-number v-model="formData.level" :min="0" :max="10" controls-position="right" style="width:100%" />
      </el-form-item>
      <el-form-item label="料号" prop="partNumber">
        <el-input v-model="formData.partNumber" placeholder="料号（可选）" />
      </el-form-item>
      <el-form-item label="位号" prop="referenceDesignator">
        <el-input v-model="formData.referenceDesignator" placeholder="如: R1,R2,R3" />
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" placeholder="节点名称" maxlength="100" />
      </el-form-item>
      <el-form-item label="数量" prop="quantity">
        <el-input-number v-model="formData.quantity" :min="1" :max="99999" controls-position="right" style="width:100%" />
      </el-form-item>
      <el-form-item label="单位" prop="unit">
        <el-select v-model="formData.unit" filterable allow-create style="width:100%">
          <el-option label="PCS" value="PCS" />
          <el-option label="SET" value="SET" />
          <el-option label="M" value="M" />
          <el-option label="KG" value="KG" />
          <el-option label="ROLL" value="ROLL" />
        </el-select>
      </el-form-item>
      <el-form-item label="类型" prop="nodeType">
        <el-select v-model="formData.nodeType" :disabled="!isEditMode" style="width:100%">
          <el-option label="组件/装配体" value="assembly" />
          <el-option label="元器件" value="component" />
        </el-select>
      </el-form-item>
      <el-form-item label="工序" prop="process">
        <el-input v-model="formData.process" placeholder="工序名称（可选）" />
      </el-form-item>
      <el-form-item label="层内编号" prop="sortOrder">
        <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" controls-position="right" style="width:100%" />
      </el-form-item>
      <el-form-item label="备注" prop="notes">
        <el-input v-model="formData.notes" type="textarea" :rows="2" placeholder="备注信息" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirm">保存</el-button>
    </template>
  </el-dialog>
</template>