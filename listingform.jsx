import React, { useState } from "react";

const ListingForm = ({ onAdd }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    module: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(form);

    // reset
    setForm({
      title: "",
      description: "",
      price: "",
      module: ""
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <input
        name="title"
        placeholder="Title (e.g. C270 Notes)"
        value={form.title}
        onChange={handleChange}
        required
      />

      <input
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={handleChange}
        required
      />

      <input
        name="price"
        placeholder="Price or type 'Free'"
        value={form.price}
        onChange={handleChange}
        required
      />

      <input
        name="module"
        placeholder="Module (e.g. C270)"
        value={form.module}
        onChange={handleChange}
        required
      />

      <button type="submit">Add Listing</button>
    </form>
  );
};

export default ListingForm;